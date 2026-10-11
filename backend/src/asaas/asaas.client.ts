import { BadGatewayException, BadRequestException, HttpException } from '@nestjs/common';

export type AsaasEnvironment = 'production' | 'sandbox';
export type AsaasBillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED';

const BASE_URL: Record<AsaasEnvironment, string> = {
  production: 'https://api.asaas.com/v3',
  sandbox: 'https://api-sandbox.asaas.com/v3',
};

/** O ambiente da chave vem do prefixo: $aact_prod_ (produção) ou $aact_hmlg_ (sandbox). */
export function environmentFromKey(apiKey: string): AsaasEnvironment | null {
  const key = apiKey.trim();
  if (key.startsWith('$aact_prod_')) return 'production';
  if (key.startsWith('$aact_hmlg_')) return 'sandbox';
  return null;
}

const AUTH_ERRORS: Record<string, string> = {
  access_token_not_found: 'O Asaas não recebeu a chave de API.',
  invalid_access_token_format: 'A chave de API está em formato inválido. Cole a chave inteira, começando por $aact_.',
  invalid_access_token: 'Chave de API inválida ou revogada.',
  invalid_environment: 'Esta chave é de outro ambiente (produção x sandbox).',
};

export interface AsaasPayment {
  id: string;
  status: string;
  billingType: string;
  value: number;
  dueDate: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  externalReference?: string;
  deleted?: boolean;
}

export interface AsaasCustomerInput {
  name: string;
  cpfCnpj: string;
  email?: string;
  mobilePhone?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  observations?: string;
  externalReference?: string;
  notificationDisabled: boolean;
}

// Cliente HTTP mínimo da API v3 do Asaas, com a chave de UMA oficina.
export class AsaasClient {
  constructor(private apiKey: string, private environment: AsaasEnvironment) {}

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL[this.environment]}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          access_token: this.apiKey,
          'User-Agent': 'SigmaAuto', // obrigatório nas contas criadas a partir de 13/06/2024
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new BadGatewayException('Não foi possível falar com o Asaas agora. Tente novamente em instantes.');
    }
    const text = await res.text();
    let data: any = {};
    try { data = text ? JSON.parse(text) : {}; } catch { /* corpo não-JSON */ }
    if (!res.ok) {
      const first = data?.errors?.[0];
      if (res.status === 401) {
        throw new BadRequestException(AUTH_ERRORS[first?.code] ?? 'Chave de API do Asaas inválida para este ambiente.');
      }
      if (res.status === 429) {
        const wait = res.headers.get('RateLimit-Reset');
        throw new HttpException(`O Asaas limitou as requisições. Aguarde${wait ? ` ${wait}s` : ' um instante'} e tente de novo.`, 429);
      }
      throw new BadRequestException(first?.description || `O Asaas recusou a operação (${res.status}).`);
    }
    return data as T;
  }

  /** Valida a chave: lê o saldo da conta. */
  balance() {
    return this.call<{ balance: number }>('GET', '/finance/balance');
  }

  async findCustomerByDocument(cpfCnpj: string): Promise<{ id: string } | null> {
    const r = await this.call<{ data: { id: string }[] }>('GET', `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}&limit=1`);
    return r.data?.[0] ?? null;
  }

  createCustomer(data: AsaasCustomerInput) {
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) if (v !== undefined && v !== '') body[k] = v;
    return this.call<{ id: string }>('POST', '/customers', body);
  }

  createPayment(data: {
    customer: string;
    billingType: AsaasBillingType;
    value: number;
    dueDate: string;
    description: string;
    externalReference: string;
  }) {
    // multa e juros ficam de fora de propósito: enviá-los vazios sobrescreve a configuração da conta
    return this.call<AsaasPayment>('POST', '/payments', data);
  }

  /** Cobranças com este externalReference (retentativa segura após timeout). */
  async findPaymentsByReference(externalReference: string): Promise<AsaasPayment[]> {
    const r = await this.call<{ data: AsaasPayment[] }>('GET', `/payments?externalReference=${encodeURIComponent(externalReference)}&limit=10`);
    return r.data ?? [];
  }

  getPayment(id: string) {
    return this.call<AsaasPayment>('GET', `/payments/${id}`);
  }

  pixQrCode(id: string) {
    return this.call<{ encodedImage: string; payload: string; expirationDate?: string }>('GET', `/payments/${id}/pixQrCode`);
  }

  deletePayment(id: string) {
    return this.call<{ deleted: boolean }>('DELETE', `/payments/${id}`);
  }

  /**
   * Cria o webhook da oficina ou atualiza o que já aponta para a mesma URL. Cada conta tem no máximo
   * 10 webhooks: criar um novo a cada "conectar" esgotaria o limite e duplicaria os avisos.
   */
  async upsertWebhook(data: { url: string; authToken: string; email: string }) {
    const body = {
      name: 'SigmaAuto',
      url: data.url,
      email: data.email,
      enabled: true,
      interrupted: false,
      apiVersion: 3,
      authToken: data.authToken,
      sendType: 'SEQUENTIALLY',
      events: [
        'PAYMENT_CREATED',
        'PAYMENT_UPDATED',
        'PAYMENT_CONFIRMED',
        'PAYMENT_RECEIVED',
        'PAYMENT_OVERDUE',
        'PAYMENT_DELETED',
        'PAYMENT_RESTORED',
        'PAYMENT_REFUNDED',
        'PAYMENT_RECEIVED_IN_CASH_UNDONE',
        'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
        'PAYMENT_CHARGEBACK_REQUESTED',
      ],
    };
    const existing = await this.call<{ data: { id: string; url: string }[] }>('GET', '/webhooks?limit=100');
    const same = existing.data?.find((w) => w.url === data.url);
    if (same) return this.call('PUT', `/webhooks/${same.id}`, body);
    return this.call('POST', '/webhooks', body);
  }
}
