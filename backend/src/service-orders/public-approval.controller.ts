import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ServiceOrdersService } from './service-orders.service';
import { AprovarOrcamentoDto } from './dto/service-order.dto';

// Página pública de aprovação do orçamento (link do WhatsApp / QR code do PDF).
// Sem login: o token de aprovação (UUID, com validade) é a credencial.
@ApiTags('Aprovação pública')
@Controller('public/approval')
export class PublicApprovalController {
  constructor(private serviceOrdersService: ServiceOrdersService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Resumo do orçamento para o cliente aprovar ou recusar' })
  summary(@Param('token') token: string) {
    return this.serviceOrdersService.getApprovalSummary(token);
  }

  @Post(':token')
  @ApiOperation({ summary: 'Cliente aprova ou recusa o orçamento' })
  decide(@Param('token') token: string, @Body() dto: AprovarOrcamentoDto) {
    return this.serviceOrdersService.approveOrcamento(token, dto);
  }
}
