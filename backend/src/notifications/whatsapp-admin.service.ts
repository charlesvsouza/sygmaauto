import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class WhatsappAdminService {
  private readonly logger = new Logger(WhatsappAdminService.name);

  constructor(private readonly config: ConfigService) {}

  private get apiUrl(): string | undefined {
    return this.config.get<string>('EVOLUTION_API_URL');
  }

  private get apiKey(): string | undefined {
    return this.config.get<string>('EVOLUTION_API_KEY');
  }

  private get instance(): string {
    return this.config.get<string>('EVOLUTION_INSTANCE') ?? 'sygmaauto';
  }

  isConfigured(): boolean {
    return !!(this.apiUrl && this.apiKey);
  }

  private authHeadersList() {
    const key = this.apiKey ?? '';
    return [
      { apikey: key, 'Content-Type': 'application/json' },
      { apiKey: key, 'Content-Type': 'application/json' },
      { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    ];
  }

  private async withAuthRetry<T>(
    runner: (headers: Record<string, string>) => Promise<T>,
  ): Promise<T> {
    const headersOptions = this.authHeadersList();
    let lastError: any;

    for (const headers of headersOptions) {
      try {
        return await runner(headers);
      } catch (err: any) {
        lastError = err;
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  }

  private normalizeQr(raw: string | null): string | null {
    if (!raw || typeof raw !== 'string') return null;
    return raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`;
  }

  private extractQrCode(data: any): string | null {
    const candidates = [
      data?.base64,
      data?.qrcode?.base64,
      data?.Qrcode?.base64,
      data?.qrcode,
      data?.qr,
      data?.code,
      data?.data?.base64,
      data?.data?.qrcode?.base64,
      data?.data?.qr,
      data?.data?.code,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.length > 20) {
        return this.normalizeQr(candidate);
      }
    }

    return null;
  }

  async getStatus() {
    if (!this.isConfigured()) {
      return { configured: false, connected: false, state: 'unknown', instanceName: this.instance };
    }

    try {
      const res = await this.withAuthRetry((headers) => axios.get(
        `${this.apiUrl}/instance/connectionState/${this.instance}`,
        { headers, timeout: 6000 },
      );
      const state = res.data?.instance?.state ?? 'unknown';
      return {
        configured: true,
        connected: state === 'open',
        state,
        instanceName: this.instance,
      };
    } catch {
      return { configured: true, connected: false, state: 'close', instanceName: this.instance };
    }
  }

  async getQrCode(): Promise<{ qrCode: string | null; error?: string }> {
    if (!this.isConfigured()) return { qrCode: null, error: 'Evolution API não configurada' };

    try {
      // Tenta criar (sem falhar fluxo se não tiver permissão)
      const createRes = await this.withAuthRetry((headers) => axios.post(
        `${this.apiUrl}/instance/create`,
        { instanceName: this.instance, qrcode: true, integration: 'WHATSAPP-BAILEYS' },
        { headers, timeout: 10000 },
      )).catch((err: any) => {
        this.logger.warn(`create instance: ${err?.response?.status ?? 'n/a'} ${err?.response?.data?.message ?? err.message}`);
        return null;
      });

      const qrFromCreate = this.extractQrCode(createRes?.data);
      if (qrFromCreate) {
        this.logger.log('QR Code obtido via create');
        return { qrCode: qrFromCreate };
      }

      // Fallbacks para versões diferentes da Evolution API
      const attempts: Array<{ method: 'get' | 'post'; path: string }> = [
        { method: 'get', path: `/instance/connect/${this.instance}` },
        { method: 'post', path: `/instance/connect/${this.instance}` },
        { method: 'get', path: `/instance/qrcode/${this.instance}` },
        { method: 'get', path: `/instance/qrbase64/${this.instance}` },
      ];

      for (const attempt of attempts) {
        try {
          const url = `${this.apiUrl}${attempt.path}`;
          const res = attempt.method === 'get'
            ? await this.withAuthRetry((headers) => axios.get(url, { headers, timeout: 10000 }))
            : await this.withAuthRetry((headers) => axios.post(url, {}, { headers, timeout: 10000 }));

          const qr = this.extractQrCode(res.data);
          if (qr) {
            this.logger.log(`QR Code obtido via ${attempt.method.toUpperCase()} ${attempt.path}`);
            return { qrCode: qr };
          }

          this.logger.warn(`Sem QR em ${attempt.method.toUpperCase()} ${attempt.path}: ${JSON.stringify(res.data)}`);
        } catch (err: any) {
          this.logger.warn(
            `Falha em ${attempt.method.toUpperCase()} ${attempt.path}: ${err?.response?.status ?? 'n/a'} ${JSON.stringify(err?.response?.data ?? err.message)}`,
          );
        }
      }

      return {
        qrCode: null,
        error: 'Não foi possível obter QR da Evolution API. Verifique EVOLUTION_API_KEY, EVOLUTION_INSTANCE e permissões da chave.',
      };
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err.message;
      this.logger.error(`Erro ao obter QR Code: ${msg} — status: ${err?.response?.status} — data: ${JSON.stringify(err?.response?.data)}`);
      return { qrCode: null, error: msg };
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConfigured()) return;
    try {
      await this.withAuthRetry((headers) => axios.delete(
        `${this.apiUrl}/instance/logout/${this.instance}`,
        { headers, timeout: 6000 },
      ));
    } catch (err: any) {
      this.logger.error(`Erro ao desconectar: ${err?.response?.data?.message ?? err.message}`);
    }
  }
}
