import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { WhatsappService } from './whatsapp.service';
import { MetaCloudWhatsappProvider } from './meta-cloud-whatsapp.provider';
import { WhatsappProviderService } from './whatsapp-provider.service';

@Module({
  imports: [ConfigModule],
  providers: [
    EmailService,
    WhatsappService,
    MetaCloudWhatsappProvider,
    WhatsappProviderService,
  ],
  exports: [EmailService, WhatsappService],
})
export class NotificationsModule {}
