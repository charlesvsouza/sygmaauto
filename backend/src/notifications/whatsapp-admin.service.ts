import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappAdminService {
  private readonly logger = new Logger(WhatsappAdminService.name);

  constructor(private readonly config: ConfigService) {}

  private get providerMode(): string {
    return (this.config.get<string>('WHATSAPP_PROVIDER') ?? 'META_CLOUD').trim().toUpperCase();
  }

  private isMetaConfigured(): boolean {
    const token = this.config.get<string>('META_WHATSAPP_TOKEN') ?? '';
    const phoneNumberId = this.config.get<string>('META_WHATSAPP_PHONE_NUMBER_ID') ?? '';
    return !!(token && phoneNumberId);
  }

  async getStatus() {
    const configured = this.isMetaConfigured();
    const evolutionStillSelected = this.providerMode === 'EVOLUTION';
    return {
      configured: configured && !evolutionStillSelected,
      connected: configured && !evolutionStillSelected,
      state: configured && !evolutionStillSelected ? 'open' : 'not_configured',
      provider: 'META_CLOUD',
      instanceName: '',
      qrAvailable: false,
      message: evolutionStillSelected
        ? 'Provider EVOLUTION foi removido por segurança. Use WHATSAPP_PROVIDER=META_CLOUD.'
        : configured
          ? 'Provider Meta Cloud configurado. Conexao via QR nao se aplica.'
          : 'Meta Cloud nao configurado. Defina META_WHATSAPP_TOKEN e META_WHATSAPP_PHONE_NUMBER_ID.',
    };
  }
}
