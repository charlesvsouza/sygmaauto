import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappAdminService } from '../notifications/whatsapp-admin.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [WhatsappController],
  providers: [WhatsappAdminService],
})
export class WhatsappModule {}
