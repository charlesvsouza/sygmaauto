import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsWebhookController } from './subscriptions.webhook.controller';
import { SubscriptionsPublicController } from './subscriptions.public.controller';
import { SubscriptionSchedulerService } from './subscription-scheduler.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule],
  controllers: [SubscriptionsController, SubscriptionsWebhookController, SubscriptionsPublicController],
  providers: [SubscriptionsService, SubscriptionSchedulerService],
})
export class SubscriptionsModule {}