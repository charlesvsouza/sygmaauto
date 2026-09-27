import { Module } from '@nestjs/common';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';
import { ImportService } from './import.service';
import { OrderDocumentsService } from './order-documents.service';
import { PublicApprovalController } from './public-approval.controller';
import { PdfModule } from '../pdf/pdf.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommissionsModule } from '../commissions/commissions.module';

@Module({
  imports: [NotificationsModule, CommissionsModule, PdfModule],
  controllers: [ServiceOrdersController, PublicApprovalController],
  providers: [ServiceOrdersService, ImportService, OrderDocumentsService],
})
export class ServiceOrdersModule {}
