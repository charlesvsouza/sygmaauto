import { Module } from '@nestjs/common';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';
import { AsaasController, AsaasWebhookController } from './asaas.controller';
import { AsaasService } from './asaas.service';

@Module({
  imports: [ServiceOrdersModule],
  controllers: [AsaasController, AsaasWebhookController],
  providers: [AsaasService],
})
export class AsaasModule {}
