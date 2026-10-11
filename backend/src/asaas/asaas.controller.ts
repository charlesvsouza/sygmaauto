import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, Capability } from '../auth/decorators/roles.decorator';
import { Tenant, CurrentUser } from '../common/decorators/tenant.decorator';
import { INVOICE_ROLES } from '../common/roles';
import { AsaasService } from './asaas.service';

class ConnectAsaasDto {
  @IsString()
  apiKey: string;

  @IsIn(['production', 'sandbox'])
  environment: 'production' | 'sandbox';
}

class CreateChargeDto {
  @IsIn(['PIX', 'BOLETO', 'CREDIT_CARD', 'UNDEFINED'])
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED';

  @IsOptional()
  @IsString()
  dueDate?: string;
}

@ApiTags('Asaas')
@Controller('asaas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AsaasController {
  constructor(private asaas: AsaasService) {}

  @Get('status')
  @Capability('os.invoice')
  @ApiOperation({ summary: 'Situação da conexão da oficina com o Asaas' })
  async status(@Tenant() tenant: { tenantId: string }, @CurrentUser() user: { role?: string }) {
    const status: any = await this.asaas.getStatus(tenant.tenantId);
    // O segredo do webhook só aparece para quem administra a conexão.
    if (!['MASTER', 'ADMIN'].includes(String(user?.role || '').toUpperCase())) {
      delete status.webhookToken;
      delete status.webhookUrl;
    }
    return status;
  }

  @Post('connect')
  @Roles('MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Conectar a conta Asaas da oficina (valida a chave)' })
  connect(@Tenant() tenant: { tenantId: string }, @Body() dto: ConnectAsaasDto) {
    return this.asaas.connect(tenant.tenantId, dto.apiKey, dto.environment);
  }

  @Delete('connect')
  @Roles('MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Desconectar o Asaas da oficina' })
  disconnect(@Tenant() tenant: { tenantId: string }) {
    return this.asaas.disconnect(tenant.tenantId);
  }

  @Get('orders/:orderId/charge')
  @Capability('os.invoice')
  @ApiOperation({ summary: 'Cobrança Asaas da O.S. (atualiza o status e traz o QR do PIX)' })
  getCharge(@Tenant() tenant: { tenantId: string }, @Param('orderId') orderId: string) {
    return this.asaas.getCharge(tenant.tenantId, orderId);
  }

  @Post('orders/:orderId/charge')
  @Capability('os.invoice')
  @ApiOperation({ summary: 'Emitir cobrança (PIX, boleto, cartão ou escolha do cliente) para a O.S.' })
  createCharge(
    @Tenant() tenant: { tenantId: string },
    @CurrentUser() user: { userId: string },
    @Param('orderId') orderId: string,
    @Body() dto: CreateChargeDto,
  ) {
    return this.asaas.createCharge(tenant.tenantId, orderId, user.userId, dto);
  }

  @Delete('orders/:orderId/charge')
  @Capability('os.invoice')
  @ApiOperation({ summary: 'Cancelar a cobrança aberta da O.S.' })
  cancelCharge(
    @Tenant() tenant: { tenantId: string },
    @CurrentUser() user: { userId: string },
    @Param('orderId') orderId: string,
  ) {
    return this.asaas.cancelCharge(tenant.tenantId, orderId, user.userId);
  }
}

// Público (o Asaas chama sem JWT): a autenticação é o token do webhook, conferido por oficina.
@ApiExcludeController()
@Controller('webhooks/asaas')
export class AsaasWebhookController {
  constructor(private asaas: AsaasService) {}

  @Post(':tenantId')
  @HttpCode(200)
  receive(
    @Param('tenantId') tenantId: string,
    @Headers('asaas-access-token') token: string | undefined,
    @Body() payload: any,
  ) {
    return this.asaas.handleWebhook(tenantId, token, payload);
  }
}
