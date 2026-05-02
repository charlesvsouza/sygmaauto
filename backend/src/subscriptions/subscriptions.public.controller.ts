import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicCheckoutDto } from './dto/subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Public Checkout')
@Controller('public/subscriptions')
export class SubscriptionsPublicController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Create public checkout and pending tenant setup' })
  async createPublicCheckout(@Body() dto: PublicCheckoutDto) {
    return this.subscriptionsService.createPublicCheckoutLink(dto);
  }
}
