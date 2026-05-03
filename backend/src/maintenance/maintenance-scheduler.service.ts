import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../notifications/whatsapp.service';

@Injectable()
export class MaintenanceSchedulerService {
  private readonly logger = new Logger(MaintenanceSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
  ) {}

  /** Verifica se um veículo está vencido por KM ou por data */
  isMaintenanceDue(vehicle: {
    km?: number | null;
    lastMaintenanceKm?: number | null;
    lastMaintenanceDate?: Date | null;
    maintenanceIntervalKm?: number | null;
    maintenanceIntervalDays?: number | null;
  }): { due: boolean; reason: string } {
    const today = new Date();

    // Verifica intervalo por KM
    if (
      vehicle.maintenanceIntervalKm &&
      vehicle.km != null &&
      vehicle.lastMaintenanceKm != null
    ) {
      const nextKm = vehicle.lastMaintenanceKm + vehicle.maintenanceIntervalKm;
      if (vehicle.km >= nextKm) {
        return {
          due: true,
          reason: `KM atual (${vehicle.km.toLocaleString('pt-BR')}) atingiu o intervalo de ${vehicle.maintenanceIntervalKm.toLocaleString('pt-BR')} km`,
        };
      }
    }

    // Verifica intervalo por data
    if (vehicle.maintenanceIntervalDays && vehicle.lastMaintenanceDate) {
      const nextDate = new Date(vehicle.lastMaintenanceDate);
      nextDate.setDate(nextDate.getDate() + vehicle.maintenanceIntervalDays);
      if (today >= nextDate) {
        return {
          due: true,
          reason: `Prazo de ${vehicle.maintenanceIntervalDays} dias atingido`,
        };
      }
    }

    return { due: false, reason: '' };
  }

  /** Retorna todos os veículos vencidos para um tenant */
  async getDueVehicles(tenantId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        tenantId,
        OR: [
          { maintenanceIntervalKm: { not: null } },
          { maintenanceIntervalDays: { not: null } },
        ],
      },
      include: { customer: true },
    });

    return vehicles
      .map((v) => ({ vehicle: v, ...this.isMaintenanceDue(v) }))
      .filter((r) => r.due);
  }

  /** Cron diário às 8h — dispara lembretes de manutenção */
  @Cron('0 8 * * *', { timeZone: 'America/Sao_Paulo' })
  async sendDailyReminders() {
    this.logger.log('Iniciando verificação diária de manutenção preventiva...');

    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        OR: [
          { maintenanceIntervalKm: { not: null } },
          { maintenanceIntervalDays: { not: null } },
        ],
      },
      include: { customer: true },
    });

    let sent = 0;
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const vehicle of vehicles) {
      const { due, reason } = this.isMaintenanceDue(vehicle);
      if (!due) continue;

      // Evita enviar mais de 1 lembrete por dia para o mesmo veículo
      if (vehicle.reminderSentAt && vehicle.reminderSentAt >= oneDayAgo) continue;

      const phone = vehicle.customer?.phone;
      if (!phone) continue;

      try {
        await this.whatsapp.sendText(
          phone,
          `🔧 *Lembrete de Manutenção — ${vehicle.brand} ${vehicle.model} (${vehicle.plate})*\n\n` +
          `Olá, *${vehicle.customer.name}*! É hora de agendar a manutenção preventiva do seu veículo.\n\n` +
          `📋 *Motivo:* ${reason}\n\n` +
          `Entre em contato com a nossa oficina para agendar. Cuidar preventivamente evita problemas maiores! 🚗✅`,
        );

        await this.prisma.vehicle.update({
          where: { id: vehicle.id },
          data: { reminderSentAt: now },
        });

        sent++;
        this.logger.log(`Lembrete enviado para ${vehicle.customer.name} — ${vehicle.plate}`);
      } catch (err: any) {
        this.logger.error(`Falha ao enviar lembrete para ${vehicle.plate}: ${err.message}`);
      }
    }

    this.logger.log(`Verificação concluída — ${sent} lembretes enviados.`);
  }
}
