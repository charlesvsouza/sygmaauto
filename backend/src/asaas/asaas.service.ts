import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceOrdersService } from '../service-orders/service-orders.service';
import { UpdateStatusDto } from '../service-orders/dto/service-order.dto';
import { decryptSecret, encryptSecret, safeEqual } from '../common/secret-box';
import { formatOrderCode } from '../common/order-number';
import { isValidCpfCnpj, onlyDigits } from '../common/br-documents';
import { AsaasBillingType, AsaasClient, AsaasEnvironment, environmentFromKey } from './asaas.client';

// Etapas em que faz sentido cobrar: da aprovação até a entrega do carro, antes de faturar.
const CHARGEABLE_STATUSES = ['APROVADO', 'AGUARDANDO_PECAS', 'EM_EXECUCAO', 'PRONTO_ENTREGA'];
const PAID_EVENTS = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'];
const PAYMENT_LABEL: Record<string, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartão de crédito',
  UNDEFINED: 'Asaas',
};

const digits = onlyDigits;

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
      notifyCustomers: account.notifyCustomers,
      // Para configurar à mão no painel do Asaas quando o cadastro automático não é possível.
      webhookUrl: this.webhookUrl(tenantId),
      webhookToken: account.webhookToken,
    };
  }

  async connect(tenantId: string, apiKey: string) {
    const key = apiKey.trim();
    if (!key) throw new BadRequestException('Informe a chave de API do Asaas.');
    // O ambiente vem do prefixo da chave: $aact_prod_ (produção) ou $aact_hmlg_ (sandbox).
    const environment = environmentFromKey(key);
    if (!environment) {
      throw new BadRequestException('A chave deve começar com $aact_prod_ (produção) ou $aact_hmlg_ (sandbox). Copie a chave inteira no Asaas.');
    }
    const client = new AsaasClient(key, environment);
    await client.balance(); // falha com mensagem clara se a chave não vale

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { email: true, name: true } });
    const existing = await this.prisma.asaasAccount.findUnique({ where: { tenantId } });
    const webhookToken = existing?.webhookToken ?? randomBytes(24).toString('hex'); // 48 caracteres (o Asaas exige 32 a 255)

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

  async setNotifyCustomers(tenantId: string, enabled: boolean) {
    await this.prisma.asaasAccount.update({ where: { tenantId }, data: { notifyCustomers: enabled } });
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
    if (!isValidCpfCnpj(cpfCnpj)) {
      throw new BadRequestException('O CPF ou CNPJ do cliente está ausente ou inválido. Corrija o cadastro do cliente para emitir a cobrança.');
    }

    // Vencimento: hoje ou futuro, no horário de Brasília.
    const todayBr = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
    const dueDate = dto.dueDate || todayBr;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || dueDate < todayBr) {
      throw new BadRequestException('O vencimento deve ser hoje ou uma data futura.');
    }

    const account = await this.prisma.asaasAccount.findUnique({ where: { tenantId } });
    if (!account) throw new BadRequestException('Conecte o Asaas em Configurações → Pagamentos antes de cobrar.');
    const environment = account.environment as AsaasEnvironment;
    const client = new AsaasClient(decryptSecret(account.apiKeyEnc), environment);

    // Reserva a emissão: dois cliques (ou duas abas) não geram duas cobranças.
    const claim = await this.prisma.serviceOrder.updateMany({
      where: { id: order.id, tenantId, asaasPaymentId: null, NOT: { asaasChargeStatus: 'CREATING' } },
      data: { asaasChargeStatus: 'CREATING' },
    });
    if (claim.count === 0) throw new BadRequestException('A cobrança desta O.S. já está sendo emitida. Aguarde alguns segundos.');

    let payment;
    try {
      // O Asaas aceita clientes duplicados: reaproveita o id guardado (do mesmo ambiente) ou o cliente
      // que já existe pelo CPF/CNPJ, e só cria quando não há nenhum.
      let asaasCustomerId =
        order.customer.asaasCustomerId && order.customer.asaasCustomerEnv === environment ? order.customer.asaasCustomerId : null;
      if (!asaasCustomerId) {
        const found = await client.findCustomerByDocument(cpfCnpj);
        const created = found ?? (await client.createCustomer({
          name: order.customer.name,
          cpfCnpj,
          email: order.customer.email || undefined,
          mobilePhone: digits(order.customer.phone) || undefined,
          address: order.customer.address || undefined,
          postalCode: digits(order.customer.cep) || undefined,
          observations: order.customer.notes || undefined,
          externalReference: order.customer.id,
          // Avisos do Asaas ao cliente (e-mail/SMS) só se a oficina quiser; no sandbox eles são reais.
          notificationDisabled: !account.notifyCustomers,
        }));
        asaasCustomerId = created.id;
        await this.prisma.customer.update({
          where: { id: order.customer.id },
          data: { asaasCustomerId, asaasCustomerEnv: environment },
        });
      }

      // Retentativa segura: se uma emissão anterior chegou ao Asaas mas a resposta se perdeu, adota a cobrança.
      const earlier = (await client.findPaymentsByReference(order.id)).find((p) => !p.deleted && p.status !== 'REFUNDED');
      payment =
        earlier ??
        (await client.createPayment({
          customer: asaasCustomerId,
          billingType: dto.billingType,
          value,
          dueDate,
          description: `O.S. ${formatOrderCode(order)}`.slice(0, 500),
          externalReference: order.id,
        }));
    } catch (err) {
      await this.prisma.serviceOrder.updateMany({ where: { id: order.id, asaasChargeStatus: 'CREATING' }, data: { asaasChargeStatus: null } });
      throw err;
    }

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

    // O evento manda mais que o campo status: exclusão e estorno chegam com o status anterior.
    const status = event === 'PAYMENT_DELETED' ? 'DELETED' : event === 'PAYMENT_REFUNDED' ? 'REFUNDED' : event === 'PAYMENT_OVERDUE' ? 'OVERDUE' : payment.status;
    await this.applyPaymentStatus(tenantId, order.id, status, event, payment.billingType);
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
