import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [ConfigModule],
  providers: [EmailService, WhatsappService],
  exports: [EmailService, WhatsappService],
})
export class NotificationsModule {}
