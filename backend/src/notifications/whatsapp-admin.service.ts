import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import QRCode from 'qrcode';

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

  private authHeadersList(apiKeyOverride?: string): Array<Record<string, string>> {
    const key = apiKeyOverride ?? this.apiKey ?? '';
    return [
      { apikey: key, 'Content-Type': 'application/json' },
      { apiKey: key, 'Content-Type': 'application/json' },
      { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    ];
  }

  private async withAuthRetry<T>(
    runner: (headers: Record<string, string>) => Promise<T>,
    apiKeyOverride?: string,
  ): Promise<T> {
    const headersOptions = this.authHeadersList(apiKeyOverride);
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

  private async getInstanceApiKey(): Promise<string | null> {
    try {
      const res = await this.withAuthRetry((headers) => axios.get(
        `${this.apiUrl}/instance/fetchInstances`,
        { headers, timeout: 8000 },
      ));

      const data = res.data;
      const instances: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.response)
          ? data.response
          : Array.isArray(data?.data)
            ? data.data
            : [];

      const current = instances.find((item) => {
        const name = item?.instance?.instanceName ?? item?.instanceName;
        return name === this.instance;
      });

      const instanceKey =
        current?.instance?.apikey ??
        current?.apikey ??
        current?.instance?.token ??
        current?.token ??
        null;

      if (instanceKey) {
        this.logger.log(`Usando apikey da instância ${this.instance} para connect/logout.`);
      }

      return instanceKey;
    } catch {
      return null;
    }
  }

  private async extractQrCode(data: any): Promise<string | null> {
    const imageCandidates = [
      data?.base64,
      data?.qrcode?.base64,
      data?.Qrcode?.base64,
      data?.data?.base64,
      data?.data?.qrcode?.base64,
      data?.response?.base64,
      data?.response?.qrcode?.base64,
    ];

    for (const candidate of imageCandidates) {
      if (typeof candidate === 'string' && candidate.length > 20) {
        return candidate.startsWith('data:') ? candidate : `data:image/png;base64,${candidate}`;
      }
    }

    const payloadCandidates = [
      data?.code,
      data?.qr,
      data?.pairingCode,
      data?.data?.code,
      data?.data?.qr,
      data?.data?.pairingCode,
      data?.response?.code,
      data?.response?.qr,
      data?.response?.pairingCode,
    ];

    for (const candidate of payloadCandidates) {
      if (typeof candidate === 'string' && candidate.length > 3) {
        try {
          // Alguns endpoints retornam o payload do QR (code) em vez de imagem base64.
          return await QRCode.toDataURL(candidate, { margin: 1, width: 320 });
        } catch {
          // Ignora candidato inválido e tenta o próximo.
        }
      }
    }

    return null;
  }

  private extractQrCount(data: any): number | null {
    const candidates = [
      data?.count,
      data?.qrcode?.count,
      data?.data?.count,
      data?.data?.qrcode?.count,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'number') return candidate;
    }

    return null;
  }

  private async wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getStatus() {
    if (!this.isConfigured()) {
      return { configured: false, connected: false, state: 'unknown', instanceName: this.instance };
    }

    try {
      const res = await this.withAuthRetry((headers) => axios.get(
        `${this.apiUrl}/instance/connectionState/${this.instance}`,
        { headers, timeout: 6000 },
      ));
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
      const instanceApiKey = await this.getInstanceApiKey();

      // Tenta criar; se já existir, segue o fluxo normalmente.
      const createRes = await this.withAuthRetry((headers) => axios.post(
        `${this.apiUrl}/instance/create`,
        { instanceName: this.instance, qrcode: true, integration: 'WHATSAPP-BAILEYS' },
        { headers, timeout: 10000 },
      )).catch((err: any) => {
        const status = err?.response?.status;
        const payload = JSON.stringify(err?.response?.data ?? err.message);
        if (status === 403 && payload.includes('already in use')) {
          this.logger.log(`create instance: já existe (${this.instance}), continuando com connect`);
          return null;
        }
        this.logger.warn(`create instance: ${status ?? 'n/a'} ${payload}`);
        return null;
      });

      const qrFromCreate = await this.extractQrCode(createRes?.data);
      if (qrFromCreate) {
        this.logger.log('QR Code obtido via create');
        return { qrCode: qrFromCreate };
      }

      // Fallbacks para versões diferentes da Evolution API.
      // Alguns endpoints retornam { count: 0 } nos primeiros segundos enquanto o QR ainda é gerado.
      const attempts: Array<{ method: 'get' | 'post'; path: string }> = [
        { method: 'get', path: `/instance/connect/${this.instance}` },
        { method: 'post', path: `/instance/connect/${this.instance}` },
        { method: 'get', path: `/instance/qrcode/${this.instance}` },
        { method: 'get', path: `/instance/qrbase64/${this.instance}` },
      ];

      const maxPollAttempts = 10;
      const pollIntervalMs = 1500;
      let recoveryAttempted = false;

      for (const attempt of attempts) {
        for (let i = 1; i <= maxPollAttempts; i += 1) {
          try {
            const url = `${this.apiUrl}${attempt.path}`;
            const res = attempt.method === 'get'
              ? await this.withAuthRetry((headers) => axios.get(url, { headers, timeout: 10000 }), instanceApiKey ?? undefined)
              : await this.withAuthRetry((headers) => axios.post(url, {}, { headers, timeout: 10000 }), instanceApiKey ?? undefined);

            const qr = await this.extractQrCode(res.data);
            if (qr) {
              this.logger.log(`QR Code obtido via ${attempt.method.toUpperCase()} ${attempt.path} (tentativa ${i})`);
              return { qrCode: qr };
            }

            const count = this.extractQrCount(res.data);
            if (
              count === 0
              && !recoveryAttempted
              && i >= 4
              && attempt.method === 'get'
              && attempt.path.startsWith('/instance/connect/')
            ) {
              recoveryAttempted = true;
              this.logger.warn(`QR travado em count=0. Executando recuperação (logout + create) para ${this.instance}.`);

              await this.withAuthRetry((headers) => axios.delete(
                `${this.apiUrl}/instance/logout/${this.instance}`,
                { headers, timeout: 8000 },
              ), instanceApiKey ?? undefined).catch((logoutErr: any) => {
                this.logger.warn(
                  `Falha no logout ${this.instance}: ${logoutErr?.response?.status ?? 'n/a'} ${JSON.stringify(logoutErr?.response?.data ?? logoutErr.message)}`,
                );
              });

              await this.wait(1200);

              await this.withAuthRetry((headers) => axios.post(
                `${this.apiUrl}/instance/create`,
                { instanceName: this.instance, qrcode: true, integration: 'WHATSAPP-BAILEYS' },
                { headers, timeout: 10000 },
              )).catch((createErr: any) => {
                const payload = JSON.stringify(createErr?.response?.data ?? createErr.message);
                this.logger.warn(`Falha no create pós-recuperação ${this.instance}: ${createErr?.response?.status ?? 'n/a'} ${payload}`);
              });
            }

            this.logger.log(
              `Aguardando QR em ${attempt.method.toUpperCase()} ${attempt.path} (tentativa ${i}/${maxPollAttempts}) count=${count ?? 'n/a'}`,
            );

            if (i < maxPollAttempts) {
              await this.wait(pollIntervalMs);
            }
          } catch (err: any) {
            const status = err?.response?.status;
            this.logger.warn(
              `Falha em ${attempt.method.toUpperCase()} ${attempt.path} (tentativa ${i}): ${status ?? 'n/a'} ${JSON.stringify(err?.response?.data ?? err.message)}`,
            );

            // Se endpoint não existir/não aceitar método, tenta o próximo endpoint.
            if (status === 404 || status === 405) break;

            // Em erros de auth, não adianta repetir esse endpoint.
            if (status === 401 || status === 403) break;

            if (i < maxPollAttempts) {
              await this.wait(pollIntervalMs);
            }
          }
        }
      }

      return {
        qrCode: null,
        error: 'QR ainda não disponível. A instância está conectando. Aguarde alguns segundos e gere novamente.',
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
