import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceOrdersService } from '../service-orders/service-orders.service';
import { UpdateStatusDto } from '../service-orders/dto/service-order.dto';
import { decryptSecret, encryptSecret, safeEqual } from '../common/secret-box';
import { formatOrderCode } from '../common/order-number';
import { AsaasBillingType, AsaasClient, AsaasEnvironment } from './asaas.client';

// Etapas em que faz sentido cobrar: da aprovação até a entrega do carro, antes de faturar.
const CHARGEABLE_STATUSES = ['APROVADO', 'AGUARDANDO_PECAS', 'EM_EXECUCAO', 'PRONTO_ENTREGA'];
const PAID_EVENTS = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'];
const PAYMENT_LABEL: Record<string, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartão de crédito',
  UNDEFINED: 'Asaas',
};

const digits = (v?: string | null) => (v ?? '').replace(/\D/g, '');

@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private serviceOrders: ServiceOrdersService,
  ) {}

  // ─── Conexão da oficina ────────────────────────────────────────────────────

  private publicApiUrl(): string | null {
    const explicit = this.config.get<string>('API_PUBLIC_URL');
    if (explicit) return explicit.replace(/\/+$/, '');
    const railway = this.config.get<string>('RAILWAY_PUBLIC_DOMAIN');
    return railway ? `https://${railway}` : null;
  }

  private webhookUrl(tenantId: string): string | null {
    const base = this.publicApiUrl();
    return base ? `${base}/webhooks/asaas/${tenantId}` : null;
  }

  private async clientFor(tenantId: string): Promise<AsaasClient> {
    const account = await this.prisma.asaasAccount.findUnique({ where: { tenantId } });
    if (!account) throw new BadRequestException('Conecte o Asaas em Configurações → Pagamentos antes de cobrar.');
    return new AsaasClient(decryptSecret(account.apiKeyEnc), account.environment as AsaasEnvironment);
  }

  async getStatus(tenantId: string) {
    const account = await this.prisma.asaasAccount.findUnique({ where: { tenantId } });
    if (!account) return { connected: false };
    return {
      connected: true,
      environment: account.environment,
      accountLabel: account.accountLabel,
      connectedAt: account.connectedAt,
      webhookConfigured: account.webhookConfigured,
      // Para configurar à mão no painel do Asaas quando o cadastro automático não é possível.
      webhookUrl: this.webhookUrl(tenantId),
      webhookToken: account.webhookToken,
    };
  }

  async connect(tenantId: string, apiKey: string, environment: AsaasEnvironment) {
    const key = apiKey.trim();
    if (!key) throw new BadRequestException('Informe a chave de API do Asaas.');
    const client = new AsaasClient(key, environment);
    await client.balance(); // falha com mensagem clara se a chave não vale

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { email: true, name: true } });
    const existing = await this.prisma.asaasAccount.findUnique({ where: { tenantId } });
    const webhookToken = existing?.webhookToken ?? randomBytes(24).toString('hex');

    let webhookConfigured = false;
    const url = this.webhookUrl(tenantId);
    if (url && tenant?.email) {
      try {
        await client.upsertWebhook({ url, authToken: webhookToken, email: tenant.email });
        webhookConfigured = true;
      } catch (err) {
        this.logger.warn(`Webhook Asaas não cadastrado automaticamente (${tenantId}): ${(err as Error).message}`);
      }
    }

    await this.prisma.asaasAccount.upsert({
      where: { tenantId },
      create: { tenantId, apiKeyEnc: encryptSecret(key), environment, webhookToken, webhookConfigured, accountLabel: tenant?.name ?? null },
      update: { apiKeyEnc: encryptSecret(key), environment, webhookToken, webhookConfigured, accountLabel: tenant?.name ?? null },
    });
    return this.getStatus(tenantId);
  }

  async disconnect(tenantId: string) {
    await this.prisma.asaasAccount.deleteMany({ where: { tenantId } });
    return { connected: false };
  }

  // ─── Cobrança da O.S. ──────────────────────────────────────────────────────

  private async loadOrder(tenantId: string, orderId: string) {
    const order = await this.prisma.serviceOrder.findFirst({
      where: { id: orderId, tenantId },
      include: { customer: true },
    });
    if (!order) throw new NotFoundException('Ordem de Serviço não encontrada');
    return order;
  }

  private chargeView(order: any) {
    if (!order.asaasPaymentId) return { hasCharge: false };
    return {
      hasCharge: true,
      paymentId: order.asaasPaymentId,
      billingType: order.asaasBillingType,
      billingLabel: PAYMENT_LABEL[order.asaasBillingType] ?? 'Asaas',
      status: order.asaasChargeStatus,
      invoiceUrl: order.asaasInvoiceUrl,
      dueDate: order.asaasDueDate,
      paidAt: order.asaasPaidAt,
      value: Number(order.totalCost || 0),
    };
  }

  async createCharge(
    tenantId: string,
    orderId: string,
    userId: string,
    dto: { billingType: AsaasBillingType; dueDate?: string },
  ) {
    const order = await this.loadOrder(tenantId, orderId);
    if (!CHARGEABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException('Só é possível cobrar uma O.S. aprovada, em execução ou pronta para entrega.');
    }
    if (order.asaasPaymentId && !['DELETED', 'REFUNDED'].includes(order.asaasChargeStatus ?? '')) {
      throw new BadRequestException('Esta O.S. já tem uma cobrança no Asaas. Cancele a atual para emitir outra.');
    }
    const value = Number(order.totalCost || 0);
    if (value <= 0) throw new BadRequestException('O valor da O.S. é zero: não há o que cobrar.');

    const cpfCnpj = digits(order.customer.document);
    if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
      throw new BadRequestException('O cliente precisa ter CPF ou CNPJ válido no cadastro para emitir a cobrança.');
    }

    // Vencimento: hoje ou futuro, no horário de Brasília.
    const todayBr = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
    const dueDate = dto.dueDate || todayBr;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || dueDate < todayBr) {
      throw new BadRequestException('O vencimento deve ser hoje ou uma data futura.');
    }

    const client = await this.clientFor(tenantId);
    const customer =
      (await client.findCustomerByDocument(cpfCnpj)) ??
      (await client.createCustomer({
        name: order.customer.name,
        cpfCnpj,
        email: order.customer.email || undefined,
        mobilePhone: digits(order.customer.phone) || undefined,
        externalReference: order.customer.id,
      }));

    const payment = await client.createPayment({
      customer: customer.id,
      billingType: dto.billingType,
      value,
      dueDate,
      description: `O.S. ${formatOrderCode(order)}`,
      externalReference: order.id,
    });

    await this.prisma.serviceOrder.update({
      where: { id: order.id },
      data: {
        asaasPaymentId: payment.id,
        asaasBillingType: dto.billingType,
        asaasChargeStatus: payment.status,
        asaasInvoiceUrl: payment.invoiceUrl ?? payment.bankSlipUrl ?? null,
        asaasDueDate: new Date(`${dueDate}T12:00:00-03:00`),
        asaasPaidAt: null,
      },
    });
    await this.timeline(order.id, 'ASAAS_CHARGE', `Cobrança ${PAYMENT_LABEL[dto.billingType]} emitida no Asaas (vence em ${dueDate.split('-').reverse().join('/')})`, userId);
    return this.getCharge(tenantId, orderId, false);
  }

  /** Dados da cobrança da O.S.; com `refresh`, confere o status no Asaas e traz o QR do PIX. */
  async getCharge(tenantId: string, orderId: string, refresh = true) {
    let order = await this.loadOrder(tenantId, orderId);
    const paymentId = order.asaasPaymentId;
    if (!paymentId) return { hasCharge: false };

    let pix: { encodedImage: string; payload: string } | null = null;
    if (refresh || order.asaasBillingType === 'PIX') {
      try {
        const client = await this.clientFor(tenantId);
        if (refresh) {
          const live = await client.getPayment(paymentId);
          if (live.status !== order.asaasChargeStatus) {
            await this.applyPaymentStatus(order.tenantId, order.id, live.status, undefined);
            order = await this.loadOrder(tenantId, orderId);
          }
        }
        if (['PIX', 'UNDEFINED'].includes(order.asaasBillingType ?? '') && !['RECEIVED', 'CONFIRMED', 'DELETED'].includes(order.asaasChargeStatus ?? '')) {
          pix = await client.pixQrCode(paymentId).catch(() => null);
        }
      } catch (err) {
        this.logger.warn(`Falha ao consultar cobrança Asaas (${orderId}): ${(err as Error).message}`);
      }
    }
    return { ...this.chargeView(order), pix };
  }

  async cancelCharge(tenantId: string, orderId: string, userId: string) {
    const order = await this.loadOrder(tenantId, orderId);
    if (!order.asaasPaymentId) throw new BadRequestException('Esta O.S. não tem cobrança no Asaas.');
    if (['RECEIVED', 'CONFIRMED'].includes(order.asaasChargeStatus ?? '')) {
      throw new BadRequestException('A cobrança já foi paga e não pode ser cancelada aqui.');
    }
    const client = await this.clientFor(tenantId);
    await client.deletePayment(order.asaasPaymentId).catch((err) => {
      // Já removida no Asaas: seguimos limpando do nosso lado.
      this.logger.warn(`Cancelamento no Asaas: ${(err as Error).message}`);
    });
    await this.prisma.serviceOrder.update({
      where: { id: order.id },
      data: { asaasPaymentId: null, asaasBillingType: null, asaasChargeStatus: null, asaasInvoiceUrl: null, asaasDueDate: null },
    });
    await this.timeline(order.id, 'ASAAS_CHARGE', 'Cobrança do Asaas cancelada', userId);
    return { hasCharge: false };
  }

  // ─── Webhook ───────────────────────────────────────────────────────────────

  async handleWebhook(tenantId: string, token: string | undefined, payload: any) {
    const account = await this.prisma.asaasAccount.findUnique({ where: { tenantId } });
    if (!account || !token || !safeEqual(token, account.webhookToken)) {
      throw new ForbiddenException('Webhook não autorizado');
    }
    const event: string = payload?.event ?? '';
    const payment = payload?.payment;
    if (!payment?.id) return { ok: true, ignored: true };

    const order = await this.prisma.serviceOrder.findFirst({
      where: { tenantId, asaasPaymentId: payment.id },
    });
    if (!order) return { ok: true, ignored: true };

    await this.applyPaymentStatus(tenantId, order.id, payment.status, event, payment.billingType);
    return { ok: true };
  }

  /** Atualiza o status da cobrança e, se paga, fatura a O.S. (uma única receita, regra de sempre). */
  private async applyPaymentStatus(tenantId: string, orderId: string, status: string, event?: string, billingType?: string) {
    const paid = status === 'RECEIVED' || status === 'CONFIRMED' || (event ? PAID_EVENTS.includes(event) : false);
    const order = await this.prisma.serviceOrder.findFirst({ where: { id: orderId, tenantId } });
    if (!order) return;

    await this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: {
        asaasChargeStatus: status,
        ...(paid && !order.asaasPaidAt ? { asaasPaidAt: new Date() } : {}),
      },
    });
    if (!paid || order.asaasPaidAt) return; // idempotente: o Asaas reenvia eventos

    await this.timeline(orderId, 'ASAAS_PAID', `Pagamento confirmado pelo Asaas (${PAYMENT_LABEL[billingType ?? order.asaasBillingType ?? 'UNDEFINED'] ?? 'Asaas'})`);
    if (order.status === 'PRONTO_ENTREGA') {
      await this.prisma.serviceOrder.update({
        where: { id: orderId },
        data: { paymentMethod: PAYMENT_LABEL[billingType ?? order.asaasBillingType ?? 'UNDEFINED'] },
      });
      await this.serviceOrders
        .updateStatus(tenantId, orderId, { status: 'FATURADO', notes: 'Pagamento recebido pelo Asaas' } as UpdateStatusDto)
        .catch((err) => this.logger.error(`Não foi possível faturar a O.S. ${orderId} após pagamento Asaas: ${err.message}`));
    }
  }

  private async timeline(serviceOrderId: string, status: string, description: string, createdBy?: string) {
    await this.prisma.serviceOrderTimeline.create({
      data: { serviceOrderId, status, eventType: 'asaas', description, createdBy },
    });
  }
}
