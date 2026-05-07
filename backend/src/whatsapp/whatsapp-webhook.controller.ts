import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { WhatsappMetaWebhookService } from './whatsapp-meta-webhook.service';

@Controller('whatsapp')
export class WhatsappWebhookController {
  constructor(
    private readonly metaWebhook: WhatsappMetaWebhookService,
  ) {}

  /** Meta webhook verification: GET /whatsapp/meta-webhook */
  @Get('meta-webhook')
  @HttpCode(200)
  verifyMetaWebhook(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') verifyToken?: string,
    @Query('hub.challenge') challenge?: string,
  ) {
    const accepted = this.metaWebhook.validateWebhookChallenge(mode, verifyToken, challenge);
    if (!accepted) {
      throw new UnauthorizedException('Meta webhook verification failed');
    }
    return accepted;
  }

  /** Meta inbound events: POST /whatsapp/meta-webhook */
  @Post('meta-webhook')
  @HttpCode(200)
  async receiveMetaWebhook(
    @Req() req: Request,
    @Body() body: any,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!rawBody) {
      throw new BadRequestException('Raw body is required for webhook signature validation');
    }

    const valid = this.metaWebhook.isValidSignature(signature, rawBody);
    if (!valid) {
      throw new UnauthorizedException('Invalid Meta webhook signature');
    }

    const result = await this.metaWebhook.processInboundEvent(body);
    return { received: true, ...result };
  }
}
