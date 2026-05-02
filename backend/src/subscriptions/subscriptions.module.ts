import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsWebhookController } from './subscriptions.webhook.controller';
import { SubscriptionsPublicController } from './subscriptions.public.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [SubscriptionsController, SubscriptionsWebhookController, SubscriptionsPublicController],
  providers: [SubscriptionsService],
})
export class SubscriptionsModule {}