import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { WhatsappProvider, WhatsappSendOptions } from './whatsapp-provider.interface';

@Injectable()
export class MetaCloudWhatsappProvider implements WhatsappProvider {
  readonly name = 'META_CLOUD';
  private readonly logger = new Logger(MetaCloudWhatsappProvider.name);

  constructor(private readonly config: ConfigService) {}

  private get token(): string {
    return this.config.get<string>('META_WHATSAPP_TOKEN') ?? '';
  }

  private get phoneNumberId(): string {
    return this.config.get<string>('META_WHATSAPP_PHONE_NUMBER_ID') ?? '';
  }

  private get apiVersion(): string {
    return this.config.get<string>('META_WHATSAPP_API_VERSION') ?? 'v22.0';
  }

  isConfigured(): boolean {
    return !!(this.token && this.phoneNumberId);
  }

  async sendText(to: string, message: string, options?: WhatsappSendOptions): Promise<void> {
    const number = this.normalizePhone(to);
    const phoneNumberId = options?.phoneNumberId || this.phoneNumberId;

    if (!this.token || !phoneNumberId) {
      this.logger.warn(`Provider Meta Cloud nao configurado; envio para ${number} descartado`);
      return;
    }

    try {
      await axios.post(
        `https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: number,
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );
      this.logger.log(`Mensagem enviada via Meta Cloud para ${number}`);
    } catch (err: any) {
      this.logger.error(
        `Falha no envio Meta Cloud para ${number}: ${err?.response?.data?.error?.message ?? err.message}`,
      );
    }
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12) return digits;
    return `55${digits}`;
  }
}
