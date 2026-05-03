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

  private normalizeInstances(data: any): any[] {
    return Array.isArray(data) ? data
      : Array.isArray(data?.response) ? data.response
      : Array.isArray(data?.data) ? data.data
      : [];
  }

  private instanceName(item: any): string | undefined {
    return item?.name ?? item?.instance?.instanceName ?? item?.instanceName;
  }

  private instanceToken(item: any): string | null {
    return (
      item?.token ??
      item?.instance?.apikey ??
      item?.apikey ??
      item?.hash ??
      item?.instance?.token ??
      null
    );
  }

  private async fetchCurrentInstance(): Promise<any | null> {
    try {
      const res = await this.withAuthRetry((headers) => axios.get(
        `${this.apiUrl}/instance/fetchInstances`,
        { headers, timeout: 8000 },
      ));
      const list = this.normalizeInstances(res.data);
      return list.find((item) => this.instanceName(item) === this.instance) ?? null;
    } catch {
      return null;
    }
  }

  private async extractQrCode(data: any): Promise<string | null> {
    if (!data) return null;

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

    this.logger.debug(`Não foi possível extrair QR da resposta: ${JSON.stringify(data).substring(0, 200)}`);
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
      this.qrStore.delete(this.instance);

      const webhookUrl = this.backendUrl
        ? `${this.backendUrl}/whatsapp/qr-webhook`
        : undefined;

      if (!webhookUrl) {
        this.logger.warn('BACKEND_PUBLIC_URL não configurado — webhook desabilitado');
      }

      // Verifica se instância já existe.
      let existing = await this.fetchCurrentInstance();
      let instanceApiKey: string | null = null;

      if (existing) {
        instanceApiKey = this.instanceToken(existing);
        const currentStatus = (existing?.connectionStatus ?? existing?.status ?? 'close').toLowerCase();
        this.logger.log(`Instância encontrada: status=${currentStatus} token=${instanceApiKey ? 'ok' : 'ausente'}`);

        // Se a instância estiver "close", tentamos um logout para "resetar" o processo Baileys antes de conectar
        if (currentStatus === 'close' || currentStatus === 'disconnected') {
          try {
            this.logger.log(`Limpando sessão anterior para resetar Baileys...`);
            await this.withAuthRetry(
              (headers) =>
                axios.delete(`${this.apiUrl}/instance/logout/${this.instance}`, { headers, timeout: 8000 }),
              instanceApiKey ?? undefined,
            ).catch(() => {}); // Ignora erro no logout
            await this.wait(1000);
          } catch (err) {
            // Ignora erro
          }
        }

        // Força atualização do webhook para garantir que aponta para a URL correta
        if (webhookUrl) {
          try {
            // Tenta o endpoint genérico de update que é mais compatível
            await this.withAuthRetry(
              (headers) =>
                axios.post(
                  `${this.apiUrl}/instance/update/${this.instance}`,
                  {
                    webhook: {
                      url: webhookUrl,
                      enabled: true,
                      byEvents: true,
                      base64: true,
                      events: ['QRCODE_UPDATED', 'CONNECTION_UPDATE', 'MESSAGES_UPSERT'],
                    },
                  },
                  { headers, timeout: 8000 },
                ),
              instanceApiKey ?? undefined,
            ).catch(async (err) => {
              // Fallback para o endpoint de webhook específico se o update falhar
              const headers = this.authHeadersList(instanceApiKey ?? undefined)[0];
              return axios.post(
                `${this.apiUrl}/webhook/set/${this.instance}`,
                {
                  url: webhookUrl,
                  enabled: true,
                  base64: true,
                },
                { headers, timeout: 5000 },
              );
            });
            this.logger.log(`Webhook sincronizado para instância existente: ${webhookUrl}`);
          } catch (err: any) {
            this.logger.warn(`Falha ao sincronizar webhook: ${err.message}`);
          }
        }
      } else {
        // Cria instância fresca com webhook.
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
            base64: true,
            events: ['QRCODE_UPDATED', 'CONNECTION_UPDATE', 'MESSAGES_UPSERT'],
          };
          this.logger.log(`Criando instância com webhook: ${webhookUrl}`);
        }

        const createRes = await this.withAuthRetry((headers) =>
          axios.post(`${this.apiUrl}/instance/create`, createPayload, {
            headers,
            timeout: 15000,
          }),
        ).catch((err: any) => {
          this.logger.error(
            `Erro no create: ${err?.response?.status ?? 'n/a'} ${JSON.stringify(
              err?.response?.data ?? err.message,
            )}`,
          );
          return null;
        });

        this.logger.log(`create response: ${JSON.stringify(createRes?.data ?? {}).substring(0, 400)}`);

        const qrFromCreate = await this.extractQrCode(createRes?.data);
        if (qrFromCreate) return { qrCode: qrFromCreate };

        instanceApiKey = this.instanceToken(createRes?.data) ?? createRes?.data?.hash ?? null;
        await this.wait(2000);
        existing = await this.fetchCurrentInstance();
        this.logger.log(`fetchInstances pós-create: ${JSON.stringify(existing ?? {}).substring(0, 200)}`);
      }

      // Dispara connect para iniciar geração do QR.
      try {
        const connectRes = await this.withAuthRetry(
          (headers) => axios.get(`${this.apiUrl}/instance/connect/${this.instance}`, { headers, timeout: 10000 }),
          instanceApiKey ?? undefined,
        );
        this.logger.log(`connect inicial: ${JSON.stringify(connectRes.data ?? {}).substring(0, 200)}`);
        const qrFromConnect = await this.extractQrCode(connectRes.data);
        if (qrFromConnect) return { qrCode: qrFromConnect };
      } catch (err: any) {
        this.logger.warn(`connect inicial: ${err?.response?.status ?? 'n/a'}`);
      }

      // Polling: webhook store tem prioridade, depois connect.
      for (let i = 1; i <= 20; i++) {
        await this.wait(2000);

        const stored = this.qrStore.get(this.instance);
        if (stored) {
          this.logger.log(`QR obtido via webhook (poll ${i})`);
          this.qrStore.delete(this.instance);
          return { qrCode: stored };
        }

        try {
          const res = await this.withAuthRetry(
            (headers) => axios.get(`${this.apiUrl}/instance/connect/${this.instance}`, { headers, timeout: 10000 }),
            instanceApiKey ?? undefined,
          );
          const qr = await this.extractQrCode(res.data);
          if (qr) {
            this.logger.log(`QR obtido via connect (poll ${i})`);
            return { qrCode: qr };
          }
          this.logger.log(`connect poll (${i}/20): ${JSON.stringify(res.data ?? {}).substring(0, 100)}`);
        } catch { /* continua */ }
      }

      return {
        qrCode: null,
        error: 'QR não gerado. Verifique se a Evolution API consegue conectar aos servidores do WhatsApp.',
      };
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err.message;
      this.logger.error(`Erro QR: ${msg}`);
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
