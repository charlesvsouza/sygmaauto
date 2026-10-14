import { Module, forwardRef } from '@nestjs/common';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';
import { ImportService } from './import.service';
import { OrderDocumentsService } from './order-documents.service';
import { PublicApprovalController } from './public-approval.controller';
import { PdfModule } from '../pdf/pdf.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { AsaasModule } from '../asaas/asaas.module';

@Module({
  imports: [NotificationsModule, CommissionsModule, PdfModule, forwardRef(() => AsaasModule)],
  controllers: [ServiceOrdersController, PublicApprovalController],
  providers: [ServiceOrdersService, ImportService, OrderDocumentsService],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}
