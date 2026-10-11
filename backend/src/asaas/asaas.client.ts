import { BadGatewayException, BadRequestException } from '@nestjs/common';

export type AsaasEnvironment = 'production' | 'sandbox';
export type AsaasBillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED';

const BASE_URL: Record<AsaasEnvironment, string> = {
  production: 'https://api.asaas.com/v3',
  sandbox: 'https://api-sandbox.asaas.com/v3',
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
          'User-Agent': 'SigmaAuto',
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
      const first = data?.errors?.[0]?.description;
      if (res.status === 401) throw new BadRequestException('Chave de API do Asaas inválida ou do ambiente errado (produção x sandbox).');
      throw new BadRequestException(first || `O Asaas recusou a operação (${res.status}).`);
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

  createCustomer(data: { name: string; cpfCnpj: string; email?: string; mobilePhone?: string; externalReference?: string }) {
    return this.call<{ id: string }>('POST', '/customers', { ...data, notificationDisabled: true });
  }

  createPayment(data: {
    customer: string;
    billingType: AsaasBillingType;
    value: number;
    dueDate: string;
    description: string;
    externalReference: string;
  }) {
    return this.call<AsaasPayment>('POST', '/payments', data);
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

  upsertWebhook(data: { url: string; authToken: string; email: string }) {
    return this.call('POST', '/webhooks', {
      name: 'SigmaAuto',
      url: data.url,
      email: data.email,
      enabled: true,
      interrupted: false,
      authToken: data.authToken,
      sendType: 'SEQUENTIALLY',
      apiVersion: 3,
      events: [
        'PAYMENT_CONFIRMED',
        'PAYMENT_RECEIVED',
        'PAYMENT_OVERDUE',
        'PAYMENT_DELETED',
        'PAYMENT_REFUNDED',
        'PAYMENT_RECEIVED_IN_CASH_UNDONE',
      ],
    });
  }
}
