import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';

@Injectable()
export class SubscriptionSchedulerService {
  private readonly logger = new Logger(SubscriptionSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Diário às 9h: envia lembrete de renovação para assinaturas que vencem em 7 dias.
   * Marca `renewalReminderSentAt` para não reenviar no mesmo dia.
   */
  @Cron('0 9 * * *', { timeZone: 'America/Sao_Paulo' })
  async sendRenewalReminders() {
    this.logger.log('Verificando assinaturas próximas do vencimento...');

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    // Janela: vence entre amanhã e 7 dias
    const tomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: { gte: tomorrow, lte: in7Days },
        OR: [
          { renewalReminderSentAt: null },
          // Não reenviar se já foi enviado nas últimas 23h
          { renewalReminderSentAt: { lt: new Date(now.getTime() - 23 * 60 * 60 * 1000) } },
        ],
      },
      include: {
        plan: true,
        tenant: true,
      },
    });

    this.logger.log(`Encontradas ${subscriptions.length} assinatura(s) para lembrete.`);

    for (const sub of subscriptions) {
      const emailTarget =
        sub.tenant.email || sub.tenant.setupInviteEmail;
      if (!emailTarget) continue;

      const daysLeft = Math.ceil(
        (sub.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      const renewalUrl = await this.buildRenewalUrl(sub.tenantId, sub.plan.name, sub.billingCycle);

      try {
        await this.emailService.sendSubscriptionRenewalReminder(emailTarget, {
          companyName: sub.tenant.name,
          planName: sub.plan.name,
          expiresAt: sub.currentPeriodEnd,
          daysLeft,
          renewalUrl,
        });

        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { renewalReminderSentAt: now },
        });

        this.logger.log(
          `Lembrete de renovação enviado para ${emailTarget} (tenant: ${sub.tenantId}, plano: ${sub.plan.name}, vence em ${daysLeft}d)`,
        );
      } catch (err: any) {
        this.logger.error(`Falha ao enviar lembrete para ${emailTarget}: ${err?.message}`);
      }
    }
  }

  /**
   * Diário às 10h: marca como PAST_DUE assinaturas expiradas que ainda estão ACTIVE.
   */
  @Cron('0 10 * * *', { timeZone: 'America/Sao_Paulo' })
  async markExpiredSubscriptions() {
    this.logger.log('Verificando assinaturas expiradas...');

    const now = new Date();
    const result = await this.prisma.subscription.updateMany({
      where: {
        status: 'ACTIVE',
        currentPeriodEnd: { lt: now },
      },
      data: {
        status: 'PAST_DUE',
      },
    });

    if (result.count > 0) {
      this.logger.warn(`${result.count} assinatura(s) marcadas como PAST_DUE por vencimento.`);
    } else {
      this.logger.log('Nenhuma assinatura expirada encontrada.');
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async buildRenewalUrl(tenantId: string, planName: string, billingCycle: string): Promise<string> {
    const frontendUrl = (
      this.configService.get<string>('FRONTEND_URL') || 'https://sigmaauto.com.br'
    ).replace(/\/+$/, '');

    const accessToken = this.configService.get<string>('MP_ACCESS_TOKEN');
    if (!accessToken) {
      return `${frontendUrl}/planos?plan=${planName}`;
    }

    // Gera preferência de pagamento diretamente no MP
    try {
      const plan = await this.prisma.subscriptionPlan.findUnique({ where: { name: planName } });
      if (!plan) return `${frontendUrl}/planos?plan=${planName}`;

      const months = this.billingCycleMonths(billingCycle);
      const discountRate = billingCycle === 'ANNUAL' ? 0.15 : 0;
      const amount = Math.round(Number(plan.price) * months * (1 - discountRate) * 100) / 100;
      const cycleLabel = this.cycleLabel(billingCycle);

      const backendPublicUrl = (
        this.configService.get<string>('BACKEND_PUBLIC_URL') ||
        `https://${this.configService.get<string>('RAILWAY_PUBLIC_DOMAIN') || ''}`
      ).replace(/\/+$/, '');

      const webhookUrl = backendPublicUrl ? `${backendPublicUrl}/webhooks/mercadopago` : undefined;

      const preferencePayload: Record<string, any> = {
        items: [
          {
            title: `Sigma Auto Plano ${planName} (${cycleLabel}) — Renovação`,
            quantity: 1,
            unit_price: amount,
            currency_id: 'BRL',
          },
        ],
        external_reference: `${tenantId}:${planName}:${billingCycle}:${Date.now()}`,
        metadata: {
          tenantId,
          plan: planName,
          billingCycle,
          billingMonths: months,
          amountCharged: amount,
          renewal: true,
        },
        back_urls: {
          success: `${frontendUrl}/settings?checkout=success`,
          pending: `${frontendUrl}/settings?checkout=cancel`,
          failure: `${frontendUrl}/settings?checkout=cancel`,
        },
        auto_return: 'approved',
        ...(webhookUrl ? { notification_url: webhookUrl } : {}),
      };

      const mpMode = (this.configService.get<string>('MP_MODE') || 'production').toLowerCase();
      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferencePayload),
      });

      if (!response.ok) throw new Error(`MP error ${response.status}`);

      const data = (await response.json()) as { init_point?: string; sandbox_init_point?: string };
      const url = mpMode === 'sandbox'
        ? (data.sandbox_init_point || data.init_point)
        : (data.init_point || data.sandbox_init_point);

      return url || `${frontendUrl}/planos?plan=${planName}`;
    } catch (err: any) {
      this.logger.error(`Falha ao gerar link MP para renovação do tenant ${tenantId}: ${err?.message}`);
      return `${frontendUrl}/planos?plan=${planName}`;
    }
  }

  private billingCycleMonths(cycle: string): number {
    switch (cycle) {
      case 'QUARTERLY': return 3;
      case 'SEMIANNUAL': return 6;
      case 'ANNUAL': return 12;
      default: return 1;
    }
  }

  private cycleLabel(cycle: string): string {
    switch (cycle) {
      case 'QUARTERLY': return 'Trimestral';
      case 'SEMIANNUAL': return 'Semestral';
      case 'ANNUAL': return 'Anual';
      default: return 'Mensal';
    }
  }
}
