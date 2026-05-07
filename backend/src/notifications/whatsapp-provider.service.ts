import { Injectable } from '@nestjs/common';
import { MetaCloudWhatsappProvider } from './meta-cloud-whatsapp.provider';
import { WhatsappProvider } from './whatsapp-provider.interface';

@Injectable()
export class WhatsappProviderService {
  constructor(
    private readonly metaCloudProvider: MetaCloudWhatsappProvider,
  ) {}

  get providerMode(): string {
    return 'META_CLOUD';
  }

  getProvider(): WhatsappProvider {
    return this.metaCloudProvider;
  }
}
