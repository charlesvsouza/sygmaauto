import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WhatsappAdminService {
  private readonly logger = new Logger(WhatsappAdminService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private get providerMode(): string {
    return (this.config.get<string>('WHATSAPP_PROVIDER') ?? 'META_CLOUD').trim().toUpperCase();
  }

  private isMetaConfigured(): boolean {
    const token = this.config.get<string>('META_WHATSAPP_TOKEN') ?? '';
    const phoneNumberId = this.config.get<string>('META_WHATSAPP_PHONE_NUMBER_ID') ?? '';
    return !!(token && phoneNumberId);
  }

  async getStatus(tenantId?: string) {
    const configured = this.isMetaConfigured();
    const evolutionStillSelected = this.providerMode === 'EVOLUTION';
    let tenantPhoneNumberId: string | null = null;

    if (tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { whatsappMetaPhoneNumberId: true },
      });
      tenantPhoneNumberId = tenant?.whatsappMetaPhoneNumberId ?? null;
    }

    const tenantConfigured = !!tenantPhoneNumberId;
    const ready = configured && tenantConfigured && !evolutionStillSelected;

    return {
      configured: ready,
      connected: ready,
      state: ready ? 'open' : 'not_configured',
      provider: 'META_CLOUD',
      instanceName: '',
      qrAvailable: false,
      message: evolutionStillSelected
        ? 'Provider EVOLUTION foi removido por segurança. Use WHATSAPP_PROVIDER=META_CLOUD.'
        : !configured
          ? 'Meta Cloud global nao configurado. Defina META_WHATSAPP_TOKEN e META_WHATSAPP_PHONE_NUMBER_ID no backend.'
          : !tenantConfigured
            ? 'Numero da oficina nao configurado. Preencha o Phone Number ID na aba Configuracoes.'
            : 'Provider Meta Cloud configurado e pronto para envio oficial.',
    };
  }
}
