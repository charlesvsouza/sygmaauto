import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { ServiceOrdersModule } from './service-orders/service-orders.module';
import { ServicesModule } from './services/services.module';
import { InventoryModule } from './inventory/inventory.module';
import { FinancialModule } from './financial/financial.module';
import { ManagementModule } from './management/management.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SuperAdminModule } from './superadmin/superadmin.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { ChecklistModule } from './checklist/checklist.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { CommissionsModule } from './commissions/commissions.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'oficina360-secret-key',
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    CustomersModule,
    VehiclesModule,
    ServiceOrdersModule,
    ServicesModule,
    InventoryModule,
    FinancialModule,
    SubscriptionsModule,
    ManagementModule,
    SuppliersModule,
    SuperAdminModule,
    OnboardingModule,
    ChecklistModule,
    WhatsappModule,
    MaintenanceModule,
    CommissionsModule,
  ],
  providers: [TenantMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.ALL },
        { path: 'auth/register', method: RequestMethod.ALL },
        { path: 'auth/refresh', method: RequestMethod.ALL },
        { path: 'auth/forgot-password/request', method: RequestMethod.ALL },
        { path: 'auth/forgot-password/reset', method: RequestMethod.ALL },
        { path: 'onboarding/(.*)', method: RequestMethod.ALL },
        { path: 'service-orders/approval/:token', method: RequestMethod.ALL },
        { path: 'webhooks/(.*)', method: RequestMethod.ALL },
        { path: 'superadmin/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}