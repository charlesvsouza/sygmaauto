import { Module } from '@nestjs/common';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';
import { ImportService } from './import.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService, ImportService],
})
export class ServiceOrdersModule {}
