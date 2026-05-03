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

  async getQrCode(): Promise<{ qrCode: string | null; error?: string }> {
    if (!this.isConfigured()) return { qrCode: null, error: 'Evolution API não configurada' };

    try {
      // 1. Apaga a instância existente para garantir estado limpo
      this.logger.log(`Deletando instância ${this.instance} para forçar novo QR...`);
      await axios.delete(
        `${this.apiUrl}/instance/delete/${this.instance}`,
        { headers: this.headers(), timeout: 8000 },
      ).catch((e) => this.logger.warn(`delete: ${e?.response?.status} ${e?.response?.data?.message ?? e.message}`));

      // 2. Recria a instância — o QR vem direto na resposta
      this.logger.log(`Criando instância ${this.instance}...`);
      const createRes = await axios.post(
        `${this.apiUrl}/instance/create`,
        { instanceName: this.instance, qrcode: true, integration: 'WHATSAPP-BAILEYS' },
        { headers: this.headers(), timeout: 10000 },
      );

      this.logger.log(`create response: ${JSON.stringify(createRes.data)}`);

      const rawQr =
        createRes.data?.qrcode?.base64 ??
        createRes.data?.base64 ??
        createRes.data?.qr ??
        null;

      if (rawQr) {
        const qrCode = rawQr.startsWith('data:') ? rawQr : `data:image/png;base64,${rawQr}`;
        this.logger.log('QR Code obtido via create');
        return { qrCode };
      }

      // 3. Se o create não trouxe o QR, tenta o connect
      this.logger.log('QR não veio no create, tentando connect...');
      const qrRes = await axios.get(
        `${this.apiUrl}/instance/connect/${this.instance}`,
        { headers: this.headers(), timeout: 8000 },
      );

      this.logger.log(`connect response: ${JSON.stringify(qrRes.data)}`);

      const rawQr2 =
        qrRes.data?.base64 ??
        qrRes.data?.qrcode?.base64 ??
        qrRes.data?.code ??
        null;

      if (!rawQr2) {
        return { qrCode: null, error: `QR não disponível. create: ${JSON.stringify(createRes.data)} | connect: ${JSON.stringify(qrRes.data)}` };
      }

      const qrCode2 = rawQr2.startsWith('data:') ? rawQr2 : `data:image/png;base64,${rawQr2}`;
      return { qrCode: qrCode2 };
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err.message;
      this.logger.error(`Erro ao obter QR Code: ${msg} — status: ${err?.response?.status} — data: ${JSON.stringify(err?.response?.data)}`);
      return { qrCode: null, error: msg };
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
