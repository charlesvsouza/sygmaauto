import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MaintenanceSchedulerService } from './maintenance-scheduler.service';
import { MaintenanceController } from './maintenance.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, NotificationsModule],
  providers: [MaintenanceSchedulerService],
  controllers: [MaintenanceController],
  exports: [MaintenanceSchedulerService],
})
export class MaintenanceModule {}
