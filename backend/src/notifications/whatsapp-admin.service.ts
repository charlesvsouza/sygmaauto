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

  private headers() {
    return { apikey: this.apiKey, 'Content-Type': 'application/json' };
  }

  async getStatus() {
    if (!this.isConfigured()) {
      return { configured: false, connected: false, state: 'unknown', instanceName: this.instance };
    }

    try {
      const res = await axios.get(
        `${this.apiUrl}/instance/connectionState/${this.instance}`,
        { headers: this.headers(), timeout: 6000 },
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

  async getQrCode(): Promise<{ qrCode: string | null }> {
    if (!this.isConfigured()) return { qrCode: null };

    try {
      // Garante que a instância existe, cria se necessário
      await axios.get(`${this.apiUrl}/instance/fetchInstances`, {
        headers: this.headers(), timeout: 6000,
      }).catch(() => null);

      // Solicita conexão (caso não exista)
      await axios.post(
        `${this.apiUrl}/instance/create`,
        { instanceName: this.instance, qrcode: true, integration: 'WHATSAPP-BAILEYS' },
        { headers: this.headers(), timeout: 8000 },
      ).catch(() => null); // ignora erro se já existir

      // Obtém QR
      const qrRes = await axios.get(
        `${this.apiUrl}/instance/connect/${this.instance}`,
        { headers: this.headers(), timeout: 8000 },
      );
      const rawQr = qrRes.data?.base64 ?? qrRes.data?.qrcode?.base64 ?? null;
      // Garante que o retorno sempre é uma data URL válida
      const qrCode = rawQr
        ? (rawQr.startsWith('data:') ? rawQr : `data:image/png;base64,${rawQr}`)
        : null;
      return { qrCode };
    } catch (err: any) {
      this.logger.error(`Erro ao obter QR Code: ${err?.response?.data?.message ?? err.message}`);
      return { qrCode: null };
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConfigured()) return;
    try {
      await axios.delete(
        `${this.apiUrl}/instance/logout/${this.instance}`,
        { headers: this.headers(), timeout: 6000 },
      );
    } catch (err: any) {
      this.logger.error(`Erro ao desconectar: ${err?.response?.data?.message ?? err.message}`);
    }
  }
}
