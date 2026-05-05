import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { NpsService } from './nps.service';
import { NpsController } from './nps.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ScheduleModule.forRoot(), ConfigModule, PrismaModule, NotificationsModule],
  providers: [NpsService],
  controllers: [NpsController],
  exports: [NpsService],
})
export class NpsModule {}
