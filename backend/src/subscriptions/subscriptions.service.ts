import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { BillingCycle, ChangePlanDto, CreateCheckoutDto, PublicCheckoutDto } from './dto/subscription.dto';
export enum PlanType {
  START = 'START',
  PRO = 'PRO',
  REDE = 'REDE',
  RETIFICA_PRO = 'RETIFICA_PRO',
  RETIFICA_REDE = 'RETIFICA_REDE',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELLED = 'CANCELLED',
  TRIALING = 'TRIALING',
  PAUSED = 'PAUSED',
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async findByTenant(tenantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async changePlan(tenantId: string, dto: ChangePlanDto) {
    const allowInternalPlanChange = this.isTruthy(this.configService.get<string>('ALLOW_INTERNAL_PLAN_CHANGE'));
    if (!allowInternalPlanChange) {
      throw new ForbiddenException('Troca interna desabilitada. Use checkout online para alterar o plano.');
    }

    const subscription = await this.findByTenant(tenantId);
    const newPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { name: dto.plan },
    });

    if (!newPlan) {
      throw new NotFoundException('Plan not found');
    }

    const now = new Date();
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

    if (subscription.status === 'TRIALING') {
      return this.prisma.subscription.update({
        where: { tenantId },
        data: {
          planId: newPlan.id,
          status: 'ACTIVE',
          trialEndsAt: null,
          currentPeriodStart: now,
          currentPeriodEnd,
        },
        include: { plan: true },
      });
    }

    return this.prisma.subscription.update({
      where: { tenantId },
      data: {
        planId: newPlan.id,
        currentPeriodStart: now,
        currentPeriodEnd,
      },
      include: { plan: true },
    });
  }

  async cancel(tenantId: string) {
    return this.prisma.subscription.update({
      where: { tenantId },
      data: { cancelAtPeriodEnd: true },
      include: { plan: true },
    });
  }

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  async createCheckoutLink(tenantId: string, dto: CreateCheckoutDto) {
    // Busca subscription sem lançar erro — tenants legados podem não ter registro
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });
    const selectedPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { name: dto.plan },
    });

    if (!selectedPlan) {
      throw new NotFoundException('Plan not found');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const billingCycle = dto.billingCycle || BillingCycle.MONTHLY;
    const charge = this.calculateCharge(selectedPlan.price, billingCycle);
    const cycleLabel = this.getBillingCycleLabel(billingCycle);

    const frontendUrl = (this.configService.get<string>('FRONTEND_URL') || 'https://sigmaauto.com.br').replace(/\/+$/, ''); // dominio canonico: sigmaauto.com.br
    const defaultSuccessUrl = this.configService.get<string>('CHECKOUT_SUCCESS_URL') || `${frontendUrl}/settings?checkout=success`;
    const defaultCancelUrl = this.configService.get<string>('CHECKOUT_CANCEL_URL') || `${frontendUrl}/settings?checkout=cancel`;
    const allowedOriginsList = [
      this.toUrlOrigin(frontendUrl),
      ...String(this.configService.get<string>('CHECKOUT_ALLOWED_RETURN_ORIGINS') || '')
        .split(',')
        .map((value) => this.toUrlOrigin(value.trim())),
    ].filter((value): value is string => Boolean(value));
    const allowedReturnOrigins = new Set<string>(allowedOriginsList);

    const successUrl = this.sanitizeCheckoutReturnUrl(dto.successUrl, defaultSuccessUrl, allowedReturnOrigins);
    const cancelUrl = this.sanitizeCheckoutReturnUrl(dto.cancelUrl, defaultCancelUrl, allowedReturnOrigins);

    const mercadoPagoToken = this.configService.get<string>('MP_ACCESS_TOKEN');
    const mercadoPagoMode = (this.configService.get<string>('MP_MODE') || 'production').toLowerCase();
    const webhookUrl = this.resolveMercadoPagoWebhookUrl();

    // Preferred flow: create Mercado Pago preference dynamically.
    if (mercadoPagoToken) {
      const preferencePayload = {
        items: [
          {
            title: `Sigma Auto Plano ${selectedPlan.name} (${cycleLabel})`,
            quantity: 1,
            unit_price: charge.amount,
            currency_id: 'BRL',
            description: `Assinatura ${cycleLabel.toLowerCase()} do plano ${selectedPlan.name}`,
          },
        ],
        external_reference: `${tenant.id}:${selectedPlan.name}:${billingCycle}:${Date.now()}`,
        metadata: {
          tenantId: tenant.id,
          tenantName: tenant.name,
          plan: selectedPlan.name,
          billingCycle,
          billingMonths: charge.months,
          amountCharged: charge.amount,
          currentPlan: subscription?.plan?.name ?? 'NONE',
        },
        back_urls: {
          success: successUrl,
          pending: cancelUrl,
          failure: cancelUrl,
        },
        auto_return: 'approved',
        ...(webhookUrl ? { notification_url: webhookUrl } : {}),
      };

      const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mercadoPagoToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferencePayload),
      });

      if (!mpResponse.ok) {
        const errorText = await mpResponse.text();
        throw new InternalServerErrorException(`Mercado Pago checkout error: ${errorText}`);
      }

      const mpData = await mpResponse.json() as { init_point?: string; sandbox_init_point?: string };
      const checkoutUrl = mercadoPagoMode === 'sandbox' ? (mpData.sandbox_init_point || mpData.init_point) : (mpData.init_point || mpData.sandbox_init_point);

      if (!checkoutUrl) {
        throw new InternalServerErrorException('Mercado Pago did not return checkout URL');
      }

      return {
        provider: 'mercado_pago',
        mode: mercadoPagoMode,
        plan: dto.plan,
        billingCycle,
        amount: charge.amount,
        checkoutUrl,
      };
    }

    const checkoutByPlan: Record<string, string | undefined> = {
      START: this.configService.get<string>('CHECKOUT_URL_START'),
      PRO: this.configService.get<string>('CHECKOUT_URL_PRO'),
      REDE: this.configService.get<string>('CHECKOUT_URL_REDE'),
      RETIFICA_PRO: this.configService.get<string>('CHECKOUT_URL_RETIFICA_PRO'),
      RETIFICA_REDE: this.configService.get<string>('CHECKOUT_URL_RETIFICA_REDE'),
    };

    const configuredCheckout = checkoutByPlan[dto.plan];
    if (!configuredCheckout) {
      throw new NotFoundException('Configure MP_ACCESS_TOKEN ou CHECKOUT_URL_* para habilitar checkout');
    }

    const checkoutUrl = new URL(configuredCheckout);
    checkoutUrl.searchParams.set('tenantId', tenant.id);
    checkoutUrl.searchParams.set('tenantName', tenant.name);
    checkoutUrl.searchParams.set('plan', dto.plan);
    checkoutUrl.searchParams.set('billingCycle', billingCycle);
    checkoutUrl.searchParams.set('amount', String(charge.amount));
    checkoutUrl.searchParams.set('currentPlan', subscription?.plan?.name ?? 'NONE');

    if (successUrl) checkoutUrl.searchParams.set('success_url', successUrl);
    if (cancelUrl) checkoutUrl.searchParams.set('cancel_url', cancelUrl);

    return {
      provider: 'external_checkout',
      plan: dto.plan,
      billingCycle,
      amount: charge.amount,
      checkoutUrl: checkoutUrl.toString(),
    };
  }

  async createPublicCheckoutLink(dto: PublicCheckoutDto) {
    const inviteEmail = String(dto.inviteEmail || '').toLowerCase().trim();
    if (!inviteEmail.includes('@')) {
      throw new ConflictException('Informe um email válido para receber o convite de ativação');
    }

    const selectedPlan = await this.prisma.subscriptionPlan.findUnique({ where: { name: dto.plan } });
    if (!selectedPlan) {
      throw new NotFoundException('Plan not found');
    }

    const normalizedDocument = (dto.document || '').trim();
    if (normalizedDocument) {
      const existingByDocument = await this.prisma.tenant.findUnique({ where: { document: normalizedDocument } });
      if (existingByDocument && existingByDocument.status !== 'PENDING_SETUP') {
        throw new ConflictException('Já existe um tenant ativo com este documento');
      }
    }

    const billingCycle = dto.billingCycle || BillingCycle.MONTHLY;
    const charge = this.calculateCharge(selectedPlan.price, billingCycle);
    const cycleLabel = this.getBillingCycleLabel(billingCycle);

    const pendingTenant = await this.findOrCreatePendingTenant({
      tenantName: dto.tenantName,
      inviteEmail,
      document: normalizedDocument,
    });

    await this.upsertPendingSubscription(pendingTenant.id, selectedPlan.id);

    const frontendUrl = (this.configService.get<string>('FRONTEND_URL') || 'https://sigmaauto.com.br').replace(/\/+$/, '');
    const defaultSuccessUrl = this.configService.get<string>('CHECKOUT_SUCCESS_URL') || `${frontendUrl}/?checkout=success`;
    const defaultCancelUrl = this.configService.get<string>('CHECKOUT_CANCEL_URL') || `${frontendUrl}/?checkout=cancel`;
    const allowedOriginsList = [
      this.toUrlOrigin(frontendUrl),
      ...String(this.configService.get<string>('CHECKOUT_ALLOWED_RETURN_ORIGINS') || '')
        .split(',')
        .map((value) => this.toUrlOrigin(value.trim())),
    ].filter((value): value is string => Boolean(value));
    const allowedReturnOrigins = new Set<string>(allowedOriginsList);

    const successUrl = this.sanitizeCheckoutReturnUrl(dto.successUrl, defaultSuccessUrl, allowedReturnOrigins);
    const cancelUrl = this.sanitizeCheckoutReturnUrl(dto.cancelUrl, defaultCancelUrl, allowedReturnOrigins);

    const mercadoPagoToken = this.configService.get<string>('MP_ACCESS_TOKEN');
    const mercadoPagoMode = (this.configService.get<string>('MP_MODE') || 'production').toLowerCase();
    const webhookUrl = this.resolveMercadoPagoWebhookUrl();
    const payerPayload = this.buildMercadoPagoPayer({
      email: inviteEmail,
      fullName: dto.tenantName,
      document: normalizedDocument,
    });

    if (mercadoPagoToken) {
      const preferencePayload = {
        items: [
          {
            title: `Sigma Auto Plano ${selectedPlan.name} (${cycleLabel})`,
            quantity: 1,
            unit_price: charge.amount,
            currency_id: 'BRL',
            description: `Assinatura ${cycleLabel.toLowerCase()} do plano ${selectedPlan.name}`,
          },
        ],
        payer: payerPayload,
        external_reference: `${pendingTenant.id}:${selectedPlan.name}:${billingCycle}:${Date.now()}`,
        metadata: {
          tenantId: pendingTenant.id,
          tenantName: pendingTenant.name,
          plan: selectedPlan.name,
          billingCycle,
          billingMonths: charge.months,
          amountCharged: charge.amount,
          inviteEmail,
          publicCheckout: true,
        },
        back_urls: {
          success: successUrl,
          pending: cancelUrl,
          failure: cancelUrl,
        },
        auto_return: 'approved',
        ...(webhookUrl ? { notification_url: webhookUrl } : {}),
      };

      const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mercadoPagoToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferencePayload),
      });

      if (!mpResponse.ok) {
        const errorText = await mpResponse.text();
        throw new InternalServerErrorException(`Mercado Pago checkout error: ${errorText}`);
      }

      const mpData = await mpResponse.json() as { init_point?: string; sandbox_init_point?: string };
      const checkoutUrl = mercadoPagoMode === 'sandbox' ? (mpData.sandbox_init_point || mpData.init_point) : (mpData.init_point || mpData.sandbox_init_point);

      if (!checkoutUrl) {
        throw new InternalServerErrorException('Mercado Pago did not return checkout URL');
      }

      return {
        provider: 'mercado_pago',
        mode: mercadoPagoMode,
        tenantId: pendingTenant.id,
        plan: dto.plan,
        billingCycle,
        amount: charge.amount,
        checkoutUrl,
      };
    }

    throw new NotFoundException('Configure MP_ACCESS_TOKEN para habilitar checkout público');
  }

  async processMercadoPagoWebhook(payload: any, query?: Record<string, any>, headers?: Record<string, any>) {
    const isSimulation = payload?.live_mode === false || String(query?.live_mode || '').toLowerCase() === 'false';
    if (isSimulation) {
      return {
        received: true,
        simulated: true,
        ignored: true,
        reason: 'simulation payload',
      };
    }

    const webhookSecret = this.configService.get<string>('MP_WEBHOOK_SECRET');
    const webhookToken = this.configService.get<string>('MP_WEBHOOK_TOKEN');
    const isProduction = (this.configService.get<string>('NODE_ENV') || '').toLowerCase() === 'production';

    if (isProduction && !webhookSecret && !webhookToken) {
      throw new ForbiddenException('Webhook security is not configured');
    }

    if (webhookSecret) {
      const signatureOk = this.validateMercadoPagoSignature(headers || {}, query || {}, payload || {}, webhookSecret);
      if (!signatureOk) {
        throw new ForbiddenException('Invalid Mercado Pago signature');
      }
    }

    if (webhookToken) {
      const receivedToken = headers?.['x-webhook-token'] || headers?.['X-Webhook-Token'];
      if (receivedToken !== webhookToken) {
        throw new ForbiddenException('Invalid webhook token');
      }
    }

    const eventType = payload?.type || payload?.topic || query?.type || query?.topic;
    const paymentId =
      payload?.data?.id ||
      payload?.resource?.id ||
      query?.['data.id'] ||
      query?.id;

    if (!paymentId) {
      return { received: true, ignored: true, reason: 'missing payment id' };
    }

    if (eventType && String(eventType).toLowerCase() !== 'payment') {
      return { received: true, ignored: true, reason: `event type ${eventType} not handled` };
    }

    const accessToken = this.configService.get<string>('MP_ACCESS_TOKEN');
    if (!accessToken) {
      throw new NotFoundException('MP_ACCESS_TOKEN not configured');
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();

      // Simulacoes do painel podem enviar IDs ficticios; nesse caso respondemos 200
      // para evitar retrys infinitos do provedor por um evento nao processavel.
      if (paymentResponse.status === 400 || paymentResponse.status === 404) {
        return {
          received: true,
          ignored: true,
          reason: `payment lookup returned ${paymentResponse.status}`,
          paymentId: String(paymentId),
        };
      }

      throw new InternalServerErrorException(`Mercado Pago payment lookup failed: ${errorText}`);
    }

    const paymentData = (await paymentResponse.json()) as any;
    const paymentStatus = String(paymentData?.status || '').toLowerCase();

    if (paymentStatus !== 'approved') {
      return {
        received: true,
        ignored: true,
        reason: `payment status ${paymentStatus} not approved`,
      };
    }

    const metadata = paymentData?.metadata || {};
    let tenantId: string | undefined = metadata?.tenantId;
    let planName: string | undefined = metadata?.plan;
    let billingCycle: BillingCycle | undefined = metadata?.billingCycle;
    let inviteEmail: string | undefined = metadata?.inviteEmail;

    const externalReference = String(paymentData?.external_reference || '');
    if ((!tenantId || !planName) && externalReference.includes(':')) {
      const [refTenantId, refPlan, refCycle] = externalReference.split(':');
      tenantId = tenantId || refTenantId;
      planName = planName || refPlan;
      billingCycle = billingCycle || this.parseBillingCycle(refCycle);
    }

    if (!tenantId || !planName) {
      return { received: true, ignored: true, reason: 'missing tenantId or plan in metadata' };
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { name: planName } });
    if (!plan) {
      throw new NotFoundException('Plan not found for webhook processing');
    }

    const approvedAt = paymentData?.date_approved || paymentData?.date_created;
    const currentPeriodStart = approvedAt ? new Date(approvedAt) : new Date();
    if (Number.isNaN(currentPeriodStart.getTime())) {
      throw new InternalServerErrorException('Invalid payment approval date');
    }
    const monthsToAdd = this.getBillingCycleMonths(billingCycle || BillingCycle.MONTHLY);
    const currentPeriodEnd = new Date(currentPeriodStart);
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + monthsToAdd);

    const currentSubscription = await this.findByTenant(tenantId);
    const currentEnd = currentSubscription.currentPeriodEnd ? new Date(currentSubscription.currentPeriodEnd) : null;
    const isDuplicateApprovedPayment =
      currentSubscription.plan.name === plan.name &&
      currentSubscription.status === 'ACTIVE' &&
      currentEnd !== null &&
      currentEnd.getTime() >= currentPeriodEnd.getTime();

    if (isDuplicateApprovedPayment) {
      return {
        received: true,
        ignored: true,
        reason: 'payment already applied',
        paymentId: String(paymentId),
      };
    }

    const resolvedBillingCycle = billingCycle || BillingCycle.MONTHLY;

    const updated = await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        planId: plan.id,
        status: 'ACTIVE',
        billingCycle: resolvedBillingCycle,
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        currentPeriodStart,
        currentPeriodEnd,
        renewalReminderSentAt: null, // reset para o novo ciclo
      },
      include: { plan: true },
    });

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found during webhook processing');
    }

    if (tenant.status === 'PENDING_SETUP') {
      const setupInviteToken = tenant.setupInviteToken || randomUUID();
      const setupInviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const finalInviteEmail = (inviteEmail || tenant.setupInviteEmail || tenant.email || '').toLowerCase().trim();

      if (finalInviteEmail) {
        await this.prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            setupInviteEmail: finalInviteEmail,
            setupInviteToken,
            setupInviteExpiresAt,
          },
        });

        const frontendUrl = (this.configService.get<string>('FRONTEND_URL') || 'https://sigmaauto.com.br').replace(/\/+$/, '');
        const activationLink = `${frontendUrl}/activate/${setupInviteToken}`;
        await this.emailService.sendTenantSetupEmail(finalInviteEmail, {
          companyName: tenant.name,
          activationLink,
          expiresAt: setupInviteExpiresAt,
        });
      }
    }

    // Notificação interna de nova venda/renovação
    const paymentAmount =
      paymentData?.transaction_amount ??
      paymentData?.transaction_details?.total_paid_amount ??
      0;
    const notifyEmail = inviteEmail || tenant.setupInviteEmail || tenant.email || '';
    this.emailService
      .sendAdminNewSaleNotification({
        companyName: tenant.name,
        planName: plan.name,
        billingCycle: resolvedBillingCycle,
        amount: Number(paymentAmount),
        inviteEmail: notifyEmail,
        paymentId: String(paymentId),
        tenantId,
      })
      .catch((err: any) =>
        this.logger.error(`Falha ao enviar notificação admin de venda: ${err?.message}`),
      );

    return {
      received: true,
      processed: true,
      paymentId: String(paymentId),
      tenantId,
      plan: updated.plan.name,
      billingCycle: resolvedBillingCycle,
      status: updated.status,
    };
  }

  async checkAccess(tenantId: string, requiredPlan: string) {
    const subscription = await this.findByTenant(tenantId);
    
    if (subscription.status === 'TRIALING' && subscription.trialEndsAt && new Date() > subscription.trialEndsAt) {
      throw new ForbiddenException('Trial period expired');
    }

    if (subscription.status === 'PAST_DUE') {
      throw new ForbiddenException('Subscription past due');
    }

    const planHierarchy: Record<string, number> = {
      START: 1,
      PRO: 2,
      REDE: 3,
    };

    const requiredLevel = planHierarchy[requiredPlan] || 0;
    const userLevel = planHierarchy[subscription.plan.name] || 0;

    if (userLevel < requiredLevel) {
      throw new ForbiddenException(`This feature requires ${requiredPlan} plan`);
    }

    return true;
  }

  private async findOrCreatePendingTenant(input: { tenantName: string; inviteEmail: string; document?: string }) {
    const existingPending = await this.prisma.tenant.findFirst({
      where: {
        setupInviteEmail: input.inviteEmail,
        status: 'PENDING_SETUP',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingPending) {
      return this.prisma.tenant.update({
        where: { id: existingPending.id },
        data: {
          name: input.tenantName,
          document: input.document || existingPending.document,
          setupInviteEmail: input.inviteEmail,
        },
      });
    }

    const document = input.document || `PENDING-${randomUUID().slice(0, 8)}`;
    return this.prisma.tenant.create({
      data: {
        name: input.tenantName,
        status: 'PENDING_SETUP',
        document,
        setupInviteEmail: input.inviteEmail,
      },
    });
  }

  private async upsertPendingSubscription(tenantId: string, planId: string) {
    const now = new Date();
    return this.prisma.subscription.upsert({
      where: { tenantId },
      update: {
        planId,
        status: 'PAST_DUE',
        currentPeriodStart: now,
        currentPeriodEnd: now,
      },
      create: {
        tenantId,
        planId,
        status: 'PAST_DUE',
        currentPeriodStart: now,
        currentPeriodEnd: now,
      },
      include: { plan: true },
    });
  }

  private calculateCharge(baseMonthlyPrice: number, cycle: BillingCycle) {
    const months = this.getBillingCycleMonths(cycle);
    const gross = Number(baseMonthlyPrice) * months;
    const discountRate = this.getBillingCycleDiscountRate(cycle);
    const net = gross * (1 - discountRate);
    return {
      months,
      discountRate,
      amount: Math.round(net * 100) / 100,
    };
  }

  private getBillingCycleDiscountRate(cycle: BillingCycle) {
    if (cycle === BillingCycle.ANNUAL) {
      return 0.15;
    }

    return 0;
  }

  private getBillingCycleMonths(cycle: BillingCycle) {
    switch (cycle) {
      case BillingCycle.QUARTERLY:
        return 3;
      case BillingCycle.SEMIANNUAL:
        return 6;
      case BillingCycle.ANNUAL:
        return 12;
      default:
        return 1;
    }
  }

  private getBillingCycleLabel(cycle: BillingCycle) {
    switch (cycle) {
      case BillingCycle.QUARTERLY:
        return 'Trimestral';
      case BillingCycle.SEMIANNUAL:
        return 'Semestral';
      case BillingCycle.ANNUAL:
        return 'Anual';
      default:
        return 'Mensal';
    }
  }

  private parseBillingCycle(raw: string | undefined): BillingCycle | undefined {
    const normalized = String(raw || '').toUpperCase();
    if (normalized === BillingCycle.MONTHLY) return BillingCycle.MONTHLY;
    if (normalized === BillingCycle.QUARTERLY) return BillingCycle.QUARTERLY;
    if (normalized === BillingCycle.SEMIANNUAL) return BillingCycle.SEMIANNUAL;
    if (normalized === BillingCycle.ANNUAL) return BillingCycle.ANNUAL;
    return undefined;
  }

  private buildMercadoPagoPayer(input: { email: string; fullName?: string; document?: string }) {
    const nameParts = String(input.fullName || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'SigmaAuto';
    const identification = this.toMercadoPagoIdentification(input.document || '');

    return {
      email: input.email,
      first_name: firstName,
      last_name: lastName,
      ...identification,
    };
  }

  private toMercadoPagoIdentification(document: string) {
    const digits = String(document || '').replace(/\D/g, '');

    // Checkout Pro para pagador pessoa fisica funciona melhor com CPF.
    // CNPJ continua armazenado no tenant, mas nao preenche identificacao do payer.
    if (digits.length === 11) {
      return {
        identification: {
          type: 'CPF',
          number: digits,
        },
      };
    }

    return {};
  }

  private validateMercadoPagoSignature(
    headers: Record<string, any>,
    query: Record<string, any>,
    payload: Record<string, any>,
    secret: string,
  ) {
    const rawSignature = String(headers?.['x-signature'] || headers?.['X-Signature'] || '');
    const requestId = String(headers?.['x-request-id'] || headers?.['X-Request-Id'] || '');

    if (!rawSignature || !requestId) {
      return false;
    }

    const signatureParts = rawSignature.split(',').map((p) => p.trim());
    const ts = signatureParts.find((p) => p.startsWith('ts='))?.split('=')[1] || '';
    const v1 = signatureParts.find((p) => p.startsWith('v1='))?.split('=')[1] || '';

    if (!ts || !v1) {
      return false;
    }

    const rawDataId = query?.['data.id'] || payload?.data?.id || query?.id || '';
    const dataId = String(rawDataId || '').toLowerCase();

    const manifestParts = [] as string[];
    if (dataId) manifestParts.push(`id:${dataId}`);
    if (requestId) manifestParts.push(`request-id:${requestId}`);
    if (ts) manifestParts.push(`ts:${ts}`);
    const manifest = `${manifestParts.join(';')};`;

    if (!manifestParts.length) {
      return false;
    }

    const expected = createHmac('sha256', secret).update(manifest).digest('hex');

    try {
      return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(v1, 'utf8'));
    } catch {
      return false;
    }
  }

  private sanitizeCheckoutReturnUrl(
    candidateUrl: string | undefined,
    fallbackUrl: string,
    allowedOrigins: Set<string>,
  ) {
    if (!candidateUrl) {
      return fallbackUrl;
    }

    try {
      const parsed = new URL(candidateUrl);
      if (allowedOrigins.has(parsed.origin)) {
        return parsed.toString();
      }
      return fallbackUrl;
    } catch {
      return fallbackUrl;
    }
  }

  private resolveMercadoPagoWebhookUrl() {
    const explicitWebhookUrl = this.configService.get<string>('MP_WEBHOOK_URL');
    if (explicitWebhookUrl) {
      return explicitWebhookUrl;
    }

    const backendPublicUrl = this.configService.get<string>('BACKEND_PUBLIC_URL');
    if (backendPublicUrl) {
      return `${backendPublicUrl.replace(/\/+$/, '')}/webhooks/mercadopago`;
    }

    const railwayPublicDomain = this.configService.get<string>('RAILWAY_PUBLIC_DOMAIN');
    if (railwayPublicDomain) {
      return `https://${railwayPublicDomain.replace(/\/+$/, '')}/webhooks/mercadopago`;
    }

    return undefined;
  }

  private toUrlOrigin(value: string) {
    if (!value) {
      return null;
    }

    try {
      return new URL(value).origin;
    } catch {
      return null;
    }
  }

  private isTruthy(value: string | undefined) {
    return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
  }
}