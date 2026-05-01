import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { ChangePlanDto, CreateCheckoutDto } from './dto/subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Tenant } from '../common/decorators/tenant.decorator';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current subscription' })
  async getCurrent(@Tenant() tenant: { tenantId: string }) {
    return this.subscriptionsService.findByTenant(tenant.tenantId);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get available plans' })
  async getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Post('change-plan')
  @Roles('MASTER')
  @ApiOperation({ summary: 'Change subscription plan' })
  async changePlan(@Tenant() tenant: { tenantId: string }, @Body() dto: ChangePlanDto) {
    return this.subscriptionsService.changePlan(tenant.tenantId, dto);
  }

  @Post('cancel')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancel(@Tenant() tenant: { tenantId: string }) {
    return this.subscriptionsService.cancel(tenant.tenantId);
  }

  @Post('checkout')
  @Roles('MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Create online checkout link for a plan' })
  async createCheckout(@Tenant() tenant: { tenantId: string }, @Body() dto: CreateCheckoutDto) {
    return this.subscriptionsService.createCheckoutLink(tenant.tenantId, dto);
  }
}