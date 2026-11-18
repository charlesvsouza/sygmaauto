import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ManagementService } from './management.service';
import { ManagementController } from './management.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SuperAdminGuard } from '../superadmin/guards/superadmin.guard';
import { SeedService } from '../superadmin/seed.service';

@Module({
  imports: [
    PrismaModule,
    // O SuperAdminGuard (usado no controller) precisa do JwtService neste contexto
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'oficina360-secret-key',
        signOptions: { expiresIn: '8h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ManagementService, SeedService, SuperAdminGuard],
  controllers: [ManagementController],
})
export class ManagementModule {}
