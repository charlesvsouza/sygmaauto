import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SuperAdminController } from './superadmin.controller';
import { SuperAdminService } from './superadmin.service';
import { SeedService } from './seed.service';
import { SuperAdminGuard } from './guards/superadmin.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'oficina360-secret-key',
        signOptions: { expiresIn: '8h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService, SuperAdminGuard, SeedService],
})
export class SuperAdminModule {}
