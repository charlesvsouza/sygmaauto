import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { WhatsappAdminService } from '../notifications/whatsapp-admin.service';

@Controller('whatsapp')
export class WhatsappWebhookController {
  constructor(private readonly whatsappAdmin: WhatsappAdminService) {}

  @Post('qr-webhook')
  @HttpCode(200)
  async qrWebhook(@Body() body: any) {
    this.whatsappAdmin.storeQrFromWebhook(body);
    return { received: true };
  }
}
