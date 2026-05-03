import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class WhatsappAdminService {
  private readonly logger = new Logger(WhatsappAdminService.name);
  private readonly qrStore = new Map<string, string>();

  constructor(private readonly config: ConfigService) {}

  private get apiUrl(): string {
    return this.config.get<string>('EVOLUTION_API_URL') ?? '';
  }

  private get globalApiKey(): string {
    return this.config.get<string>('EVOLUTION_API_KEY') ?? '';
  }

  private get instanceName(): string {
    return this.config.get<string>('EVOLUTION_INSTANCE') ?? 'sygmaauto';
  }

  private get backendUrl(): string {
    return this.config.get<string>('BACKEND_PUBLIC_URL') ?? '';
  }

  isConfigured(): boolean {
    return !!(this.apiUrl && this.globalApiKey);
  }

  private get globalHeaders(): Record<string, string> {
    return { apikey: this.globalApiKey, 'Content-Type': 'application/json' };
  }

  private instanceHeaders(instanceToken: string): Record<string, string> {
    return { apikey: instanceToken, 'Content-Type': 'application/json' };
  }

  /** Stores QR code received via webhook from Evolution API. */
  storeQrFromWebhook(payload: any): void {
    const event: string = (payload?.event ?? payload?.type ?? '').toUpperCase();
    const base64: string | undefined =
      payload?.data?.qrcode?.base64 ??
      payload?.data?.base64 ??
      payload?.qrcode?.base64 ??
      payload?.base64;

    if (event.includes('QR') && base64) {
      const qr = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
      this.qrStore.set(this.instanceName, qr);
      this.logger.log(`QR armazenado via webhook para instância ${this.instanceName}`);
    }
  }

  private async fetchCurrentInstance(): Promise<any | null> {
    try {
      const res = await axios.get(
        `${this.apiUrl}/instance/fetchInstances`,
        { headers: this.globalHeaders, timeout: 8000 },
      );
      const list: any[] = Array.isArray(res.data) ? res.data : [];
      return list.find((item) => (item?.name ?? item?.instance?.instanceName) === this.instanceName) ?? null;
    } catch {
      return null;
    }
  }

  private instanceToken(item: any): string | null {
    return item?.token ?? item?.hash ?? item?.apikey ?? item?.instance?.token ?? null;
  }

  private instanceStatus(item: any): string {
    return item?.connectionStatus ?? item?.instance?.state ?? 'unknown';
  }

  async getStatus() {
    if (!this.isConfigured()) {
      return { configured: false, connected: false, state: 'unknown' };
    }

    const item = await this.fetchCurrentInstance();
    if (!item) return { configured: true, connected: false, state: 'not_found' };

    const state = this.instanceStatus(item);
    return { configured: true, connected: state === 'open', state };
  }

  async getQrCode(): Promise<{ qrCode: string | null; error?: string }> {
    if (!this.isConfigured()) {
      return { qrCode: null, error: 'Evolution API não configurada — defina EVOLUTION_API_URL e EVOLUTION_API_KEY' };
    }

    this.qrStore.delete(this.instanceName);

    // Delete any existing instance to start clean
    try {
      await axios.delete(
        `${this.apiUrl}/instance/delete/${this.instanceName}`,
        { headers: this.globalHeaders, timeout: 8000 },
      );
      this.logger.log(`Instância ${this.instanceName} deletada`);
      await new Promise((r) => setTimeout(r, 2000));
    } catch {
      // Instance may not exist yet — continue
    }

    // Create fresh instance with webhook
    const webhookUrl = `${this.backendUrl}/whatsapp/qr-webhook`;
    try {
      const createPayload = {
        instanceName: this.instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: true,
          events: ['QRCODE_UPDATED', 'CONNECTION_UPDATE'],
        },
      };
      this.logger.log(`Criando instância com payload: ${JSON.stringify(createPayload)}`);
      const createRes = await axios.post(
        `${this.apiUrl}/instance/create`,
        createPayload,
        { headers: this.globalHeaders, timeout: 15000 },
      );
      this.logger.log(`Instância ${this.instanceName} criada — resposta: ${JSON.stringify(createRes.data)}`);
    } catch (err: any) {
      const detail = JSON.stringify(err?.response?.data ?? err.message);
      this.logger.error(`Erro ao criar instância: ${detail}`);
      return { qrCode: null, error: `Erro ao criar instância: ${detail}` };
    }

    // Poll /connect directly (returns QR when Baileys is ready) AND check webhook store — race
    const deadline = Date.now() + 45_000;
    let pollCount = 0;
    while (Date.now() < deadline) {
      // Check webhook store first
      const stored = this.qrStore.get(this.instanceName);
      if (stored) {
        this.logger.log(`QR obtido via webhook após ${pollCount} polls`);
        return { qrCode: stored };
      }

      // Poll /connect directly — returns QR base64 once Baileys has it
      try {
        const connectRes = await axios.get(
          `${this.apiUrl}/instance/connect/${this.instanceName}`,
          { headers: this.globalHeaders, timeout: 10000 },
        );
        const d = connectRes.data;
        const count: number = d?.count ?? d?.qrcode?.count ?? 0;
        const base64: string | undefined = d?.base64 ?? d?.qrcode?.base64;
        this.logger.log(`[poll ${++pollCount}] /connect count=${count} hasBase64=${!!base64}`);
        if (base64 && count > 0) {
          const qr = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
          this.logger.log(`QR obtido via polling /connect`);
          return { qrCode: qr };
        }
      } catch (err: any) {
        this.logger.warn(`[poll ${pollCount + 1}] /connect erro: ${JSON.stringify(err?.response?.data ?? err.message)}`);
        pollCount++;
      }

      await new Promise((r) => setTimeout(r, 3000));
    }

    return { qrCode: null, error: 'QR não chegou em 45s — WhatsApp pode estar bloqueando o IP. Aguarde alguns minutos e tente novamente.' };
  }

  async disconnect(): Promise<void> {
    if (!this.isConfigured()) return;

    const item = await this.fetchCurrentInstance();
    const token = item ? this.instanceToken(item) : null;
    const headers = token ? this.instanceHeaders(token) : this.globalHeaders;

    try {
      await axios.delete(
        `${this.apiUrl}/instance/logout/${this.instanceName}`,
        { headers, timeout: 8000 },
      );
      this.logger.log(`WhatsApp desconectado (logout)`);
    } catch (err: any) {
      this.logger.error(`Erro ao desconectar: ${err?.response?.data?.message ?? err.message}`);
    }
  }
}
