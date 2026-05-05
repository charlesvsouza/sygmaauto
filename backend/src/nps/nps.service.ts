import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../notifications/whatsapp.service';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';

const NPS_DELAY_DAYS = 1; // dias após entrega para enviar NPS

@Injectable()
export class NpsService {
  private readonly logger = new Logger(NpsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService,
  ) {}

  /** Cron diário às 9h — dispara pesquisas NPS para OS entregues há ~24h */
  @Cron('0 9 * * *', { timeZone: 'America/Sao_Paulo' })
  async sendDailyNps() {
    this.logger.log('Iniciando envio de NPS pós-entrega...');

    const since = new Date();
    since.setDate(since.getDate() - NPS_DELAY_DAYS - 1); // janela: entre 1 e 2 dias atrás
    const until = new Date();
    until.setDate(until.getDate() - NPS_DELAY_DAYS);

    const orders = await this.prisma.serviceOrder.findMany({
      where: {
        status: 'ENTREGUE',
        deliveredAt: { gte: since, lte: until },
        npsResponse: null, // ainda não enviou NPS
      },
      include: {
        customer: true,
        vehicle: true,
        tenant: true,
      },
    });

    let sent = 0;
    for (const order of orders) {
      const phone = order.customer?.phone;
      if (!phone) continue;

      try {
        await this.createAndSend(order);
        sent++;
      } catch (err: any) {
        this.logger.error(`Falha ao enviar NPS para OS ${order.id}: ${err.message}`);
      }
    }

    this.logger.log(`NPS enviado para ${sent} clientes`);
  }

  /** Cria registro NPS e envia WhatsApp */
  async createAndSend(order: any): Promise<void> {
    // Cria o registro (idempotente — se já existe, ignora)
    let nps = await this.prisma.npsResponse.findUnique({
      where: { serviceOrderId: order.id },
    });

    if (!nps) {
      const token = randomUUID();
      nps = await this.prisma.npsResponse.create({
        data: {
          tenantId: order.tenantId,
          serviceOrderId: order.id,
          customerId: order.customerId,
          vehicleId: order.vehicleId ?? null,
          token,
          sentAt: new Date(),
        },
      });
    }

    const publicUrl = this.config.get<string>('BACKEND_PUBLIC_URL') ?? '';
    const link = `${publicUrl}/nps/${nps.token}`;
    const vehicle = order.vehicle
      ? `${order.vehicle.brand} ${order.vehicle.model} (${order.vehicle.plate})`
      : 'seu veículo';

    await this.whatsapp.sendText(
      order.customer.phone,
      `⭐ *Como foi sua experiência?*\n\n` +
      `Olá, *${order.customer.name}*! O serviço do *${vehicle}* foi concluído.\n\n` +
      `Gostaríamos muito de saber sua opinião — levará menos de 1 minuto:\n${link}\n\n` +
      `Sua avaliação nos ajuda a melhorar cada dia! 🙏`,
    );
  }

  /** Disparo manual para uma OS específica (ADMIN/MASTER) */
  async sendForOrder(tenantId: string, serviceOrderId: string): Promise<{ token: string }> {
    const order = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, tenantId },
      include: { customer: true, vehicle: true, tenant: true },
    });
    if (!order) throw new NotFoundException('Ordem de Serviço não encontrada');
    if (!order.customer?.phone) throw new BadRequestException('Cliente não tem telefone cadastrado');

    await this.createAndSend(order);
    const nps = await this.prisma.npsResponse.findUnique({ where: { serviceOrderId } });
    return { token: nps!.token };
  }

  /** Resposta pública — cliente preenche (sem autenticação) */
  async submitResponse(token: string, score: number, comment?: string): Promise<void> {
    const nps = await this.prisma.npsResponse.findUnique({ where: { token } });
    if (!nps) throw new NotFoundException('Link de avaliação inválido ou expirado');
    if (nps.answeredAt) throw new BadRequestException('Esta avaliação já foi respondida');
    if (score < 0 || score > 10) throw new BadRequestException('Nota deve ser entre 0 e 10');

    await this.prisma.npsResponse.update({
      where: { token },
      data: { score, comment: comment?.trim() || null, answeredAt: new Date() },
    });
  }

  /** Busca dados de uma resposta pelo token (para exibir formulário) */
  async getByToken(token: string) {
    const nps = await this.prisma.npsResponse.findUnique({
      where: { token },
      include: { customer: { select: { name: true } }, serviceOrder: { select: { id: true } } },
    });
    if (!nps) throw new NotFoundException('Link inválido');
    return nps;
  }

  /** Dashboard NPS do tenant */
  async getDashboard(tenantId: string) {
    const all = await this.prisma.npsResponse.findMany({
      where: { tenantId, answeredAt: { not: null } },
      orderBy: { answeredAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        serviceOrder: { select: { id: true } },
      },
    });

    const promoters  = all.filter((r) => r.score! >= 9).length;
    const detractors = all.filter((r) => r.score! <= 6).length;
    const total = all.length;
    const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : null;

    const pending = await this.prisma.npsResponse.count({
      where: { tenantId, answeredAt: null },
    });

    return {
      npsScore,
      total,
      pending,
      promoters,
      passives: all.filter((r) => r.score! >= 7 && r.score! <= 8).length,
      detractors,
      responseRate: total > 0 ? Math.round((total / (total + pending)) * 100) : 0,
      recent: all.slice(0, 20),
    };
  }
}
