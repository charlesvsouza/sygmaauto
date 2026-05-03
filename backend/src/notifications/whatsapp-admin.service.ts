import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class WhatsappAdminService {
  private readonly logger = new Logger(WhatsappAdminService.name);

  constructor(private readonly config: ConfigService) {}

  private get apiUrl(): string {
    return (
      this.config.get<string>('WHAPI_API_URL') ??
      'https://gate.whapi.cloud'
    );
  }

  private get token(): string | undefined {
    return this.config.get<string>('WHAPI_TOKEN');
  }

  isConfigured(): boolean {
    return !!this.token;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  /** Chamado pelo webhook controller (mantido para compatibilidade futura). */
  storeQrFromWebhook(_payload: any): void {}

  async getStatus() {
    if (!this.isConfigured()) {
      return { configured: false, connected: false, state: 'unknown' };
    }

    try {
      const res = await axios.get(`${this.apiUrl}/health`, {
        headers: this.headers,
        timeout: 6000,
      });

      // code 1 = INIT, 2 = LAUNCH (conectado), 3 = QR (aguardando scan), 5 = ERROR
      const code: number = res.data?.health?.status?.code ?? 0;
      const connected = code === 2;
      const state = connected ? 'open' : code === 3 ? 'qr' : 'connecting';

      return { configured: true, connected, state };
    } catch {
      return { configured: true, connected: false, state: 'close' };
    }
  }

  async getQrCode(): Promise<{ qrCode: string | null; error?: string }> {
    if (!this.isConfigured()) return { qrCode: null, error: 'Whapi não configurado — defina WHAPI_TOKEN' };

    try {
      const res = await axios.get(`${this.apiUrl}/users/login`, {
        headers: this.headers,
        params: { size: 280 },
        timeout: 15000,
        responseType: 'json',
      });

      const data = res.data;

      // Resposta pode ser string base64 pura ou objeto com campo image/qr
      if (typeof data === 'string' && data.length > 50) {
        return {
          qrCode: data.startsWith('data:') ? data : `data:image/png;base64,${data}`,
        };
      }

      const image: string | undefined =
        data?.image ?? data?.qr ?? data?.base64 ?? data?.qrCode ?? data?.data?.image;

      if (typeof image === 'string' && image.length > 50) {
        return {
          qrCode: image.startsWith('data:') ? image : `data:image/png;base64,${image}`,
        };
      }

      this.logger.warn(`Resposta inesperada de /users/login: ${JSON.stringify(data).substring(0, 200)}`);
      return { qrCode: null, error: 'QR não disponível. Tente novamente em instantes.' };
    } catch (err: any) {
      const status = err?.response?.status;

      if (status === 409) {
        return { qrCode: null, error: 'WhatsApp já está conectado neste canal.' };
      }

      const msg: string = err?.response?.data?.message ?? err?.response?.data?.error ?? err.message;
      this.logger.error(`Erro ao obter QR Whapi: ${status ?? 'n/a'} — ${msg}`);
      return { qrCode: null, error: msg };
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConfigured()) return;
    try {
      await axios.post(
        `${this.apiUrl}/users/logout`,
        {},
        { headers: this.headers, timeout: 6000 },
      );
    } catch (err: any) {
      this.logger.error(
        `Erro ao desconectar Whapi: ${err?.response?.data?.message ?? err.message}`,
      );
    }
  }
}
