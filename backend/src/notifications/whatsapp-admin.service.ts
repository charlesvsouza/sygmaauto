import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import QRCode from 'qrcode';

@Injectable()
export class WhatsappAdminService {
  private readonly logger = new Logger(WhatsappAdminService.name);
  private readonly qrStore = new Map<string, string>();

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

  private get backendUrl(): string | undefined {
    return (
      this.config.get<string>('BACKEND_PUBLIC_URL') ||
      (this.config.get<string>('RAILWAY_PUBLIC_DOMAIN')
        ? `https://${this.config.get<string>('RAILWAY_PUBLIC_DOMAIN')}`
        : undefined)
    );
  }

  isConfigured(): boolean {
    return !!(this.apiUrl && this.apiKey);
  }

  /** Chamado pelo webhook controller quando a Evolution API envia o QR. */
  storeQrFromWebhook(payload: any): void {
    const instanceName: string =
      payload?.instance ?? payload?.instanceName ?? this.instance;

    const base64: string | undefined =
      payload?.data?.qrcode?.base64 ??
      payload?.data?.base64 ??
      payload?.qrcode?.base64 ??
      payload?.base64;

    if (typeof base64 === 'string' && base64.length > 20) {
      const qrCode = base64.startsWith('data:')
        ? base64
        : `data:image/png;base64,${base64}`;
      this.qrStore.set(instanceName, qrCode);
      this.logger.log(`QR Code armazenado via webhook para ${instanceName}`);
    } else {
      this.logger.log(`webhook recebido (sem base64): ${JSON.stringify(payload).substring(0, 200)}`);
    }
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

      return (
        current?.instance?.apikey ??
        current?.apikey ??
        current?.hash ??
        current?.instance?.token ??
        current?.token ??
        null
      );
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
          return await QRCode.toDataURL(candidate, { margin: 1, width: 320 });
        } catch {
          // ignora candidato inválido
        }
      }
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
      // Limpa QR anterior e apaga instância para estado limpo.
      this.qrStore.delete(this.instance);
      const oldKey = await this.getInstanceApiKey();

      await this.withAuthRetry(
        (headers) => axios.delete(`${this.apiUrl}/instance/delete/${this.instance}`, { headers, timeout: 8000 }),
        oldKey ?? undefined,
      ).catch((err: any) => {
        this.logger.log(`delete: ${err?.response?.status ?? 'n/a'}`);
      });

      await this.wait(1500);

      // Monta payload com webhook se BACKEND_PUBLIC_URL estiver configurado.
      const webhookUrl = this.backendUrl
        ? `${this.backendUrl}/whatsapp/qr-webhook`
        : undefined;

      const createPayload: Record<string, any> = {
        instanceName: this.instance,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      };

      if (webhookUrl) {
        createPayload['webhook'] = {
          url: webhookUrl,
          enabled: true,
          byEvents: true,
          events: ['QRCODE_UPDATED', 'CONNECTION_UPDATE'],
        };
        this.logger.log(`Webhook configurado: ${webhookUrl}`);
      } else {
        this.logger.warn('BACKEND_PUBLIC_URL não configurado — webhook desabilitado');
      }

      const createRes = await this.withAuthRetry((headers) => axios.post(
        `${this.apiUrl}/instance/create`,
        createPayload,
        { headers, timeout: 10000 },
      )).catch((err: any) => {
        this.logger.warn(`create: ${err?.response?.status ?? 'n/a'} ${JSON.stringify(err?.response?.data ?? err.message)}`);
        return null;
      });

      this.logger.log(`create: ${JSON.stringify(createRes?.data ?? {}).substring(0, 600)}`);

      const qrFromCreate = await this.extractQrCode(createRes?.data);
      if (qrFromCreate) {
        this.logger.log('QR obtido via create');
        return { qrCode: qrFromCreate };
      }

      const instanceApiKey = createRes?.data?.hash ?? await this.getInstanceApiKey();

      // Polling: verifica store (webhook), connect e fetchInstances.
      for (let i = 1; i <= 20; i++) {
        await this.wait(2000);

        // 1. QR já chegou via webhook?
        const stored = this.qrStore.get(this.instance);
        if (stored) {
          this.logger.log(`QR obtido do webhook store (tentativa ${i})`);
          this.qrStore.delete(this.instance);
          return { qrCode: stored };
        }

        // 2. Endpoint connect.
        try {
          const res = await this.withAuthRetry(
            (headers) => axios.get(`${this.apiUrl}/instance/connect/${this.instance}`, { headers, timeout: 10000 }),
            instanceApiKey ?? undefined,
          );
          const qr = await this.extractQrCode(res.data);
          if (qr) {
            this.logger.log(`QR obtido via connect (tentativa ${i})`);
            return { qrCode: qr };
          }
          this.logger.log(`connect (${i}/20): ${JSON.stringify(res.data ?? {}).substring(0, 150)}`);
        } catch { /* continua */ }

        // 3. fetchInstances — loga raw para diagnosticar estrutura.
        try {
          const fetchRes = await this.withAuthRetry(
            (headers) => axios.get(`${this.apiUrl}/instance/fetchInstances`, { headers, timeout: 8000 }),
          );

          const rawFetch = JSON.stringify(fetchRes.data ?? {});
          this.logger.log(`fetchInstances raw (${i}/20): ${rawFetch.substring(0, 400)}`);

          const list: any[] = Array.isArray(fetchRes.data) ? fetchRes.data
            : Array.isArray(fetchRes.data?.response) ? fetchRes.data.response
            : Array.isArray(fetchRes.data?.data) ? fetchRes.data.data : [];

          const current = list.find((item) => {
            const name = item?.instance?.instanceName ?? item?.instanceName;
            return name === this.instance;
          });

          if (current) {
            const qr = await this.extractQrCode(current) ?? await this.extractQrCode(current?.qrcode);
            if (qr) {
              this.logger.log(`QR obtido via fetchInstances (tentativa ${i})`);
              return { qrCode: qr };
            }
          }
        } catch (err: any) {
          this.logger.warn(`fetchInstances (${i}): ${err?.response?.status ?? 'n/a'}`);
        }
      }

      return {
        qrCode: null,
        error: 'QR não disponível após 40 segundos. Configure BACKEND_PUBLIC_URL para habilitar entrega por webhook.',
      };
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err.message;
      this.logger.error(`Erro QR: ${msg} — ${JSON.stringify(err?.response?.data)}`);
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
