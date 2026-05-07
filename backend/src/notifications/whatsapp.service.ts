import { Injectable, Logger } from '@nestjs/common';
import { WhatsappProviderService } from './whatsapp-provider.service';
import { PrismaService } from '../prisma/prisma.service';

export interface WaOrderPayload {
  tenantId?: string;
  customerName: string;
  customerPhone: string;
  orderNumber: number | string;
  vehicleBrand: string;
  vehicleModel: string;
  plate: string;
  approvalLink?: string;
  totalCost?: number;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly providerService: WhatsappProviderService,
    private readonly prisma: PrismaService,
  ) {}

  isConfigured(): boolean {
    return this.providerService.getProvider().isConfigured();
  }

  getProviderName(): string {
    return this.providerService.getProvider().name;
  }

  async sendText(to: string, message: string, tenantId?: string): Promise<void> {
    return this.send(to, message, tenantId);
  }

  private async resolveTenantPhoneNumberId(tenantId?: string): Promise<string | undefined> {
    if (!tenantId) return undefined;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { whatsappMetaPhoneNumberId: true },
    });

    return tenant?.whatsappMetaPhoneNumberId || undefined;
  }

  private async send(to: string, message: string, tenantId?: string): Promise<void> {
    const provider = this.providerService.getProvider();

    if (!provider.isConfigured()) {
      this.logger.warn(
        `Provider WhatsApp ${provider.name} nao configurado — mensagem para ${to} descartada`,
      );
      return;
    }

    const phoneNumberId = await this.resolveTenantPhoneNumberId(tenantId);
    await provider.sendText(to, message, { phoneNumberId });
  }

  // ── Templates ──────────────────────────────────────────────────────────────

  async notifyOrcamentoPronto(p: WaOrderPayload): Promise<void> {
    const msg =
      `🔧 *${p.vehicleBrand} ${p.vehicleModel}* (${p.plate})\n` +
      `Olá, *${p.customerName}*! O orçamento da sua OS *#${p.orderNumber}* está pronto.\n` +
      (p.approvalLink
        ? `\nClique para *aprovar ou recusar* o serviço:\n${p.approvalLink}`
        : `\nEntre em contato conosco para aprovar o serviço.`);
    await this.send(p.customerPhone, msg, p.tenantId);
  }

  async notifyAprovado(p: WaOrderPayload): Promise<void> {
    const msg =
      `✅ *OS #${p.orderNumber} aprovada!*\n` +
      `Olá, *${p.customerName}*! Recebemos a aprovação do serviço para o *${p.vehicleBrand} ${p.vehicleModel}* (${p.plate}).\n` +
      `Nossa equipe já iniciará os trabalhos. Em breve entramos em contato!`;
    await this.send(p.customerPhone, msg, p.tenantId);
  }

  async notifyProntoEntrega(p: WaOrderPayload): Promise<void> {
    const valor = p.totalCost
      ? `\n💰 Valor: *R$ ${Number(p.totalCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*`
      : '';
    const msg =
      `🏁 *Seu veículo está pronto!*\n` +
      `Olá, *${p.customerName}*! O *${p.vehicleBrand} ${p.vehicleModel}* (${p.plate}) está pronto para retirada.${valor}\n` +
      `Aguardamos você em nossa oficina. 😊`;
    await this.send(p.customerPhone, msg, p.tenantId);
  }

  async notifyEntregue(p: WaOrderPayload): Promise<void> {
    const msg =
      `🚗 *Entrega confirmada — OS #${p.orderNumber}*\n` +
      `Obrigado pela preferência, *${p.customerName}*! Esperamos que fique satisfeito com o serviço.\n` +
      `Em caso de dúvidas, estamos à disposição. ⭐`;
    await this.send(p.customerPhone, msg, p.tenantId);
  }

  async notifyCancelado(p: WaOrderPayload): Promise<void> {
    const msg =
      `❌ *OS #${p.orderNumber} cancelada*\n` +
      `Olá, *${p.customerName}*. Informamos que a ordem de serviço do *${p.vehicleBrand} ${p.vehicleModel}* (${p.plate}) foi cancelada.\n` +
      `Entre em contato conosco para mais informações.`;
    await this.send(p.customerPhone, msg, p.tenantId);
  }
}
