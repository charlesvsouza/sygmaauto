import { Controller, Get, Post, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WhatsappAdminService } from '../notifications/whatsapp-admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('WhatsApp')
@Controller('whatsapp')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class WhatsappController {
  constructor(private whatsappAdmin: WhatsappAdminService) {}

  @Get('status')
  @ApiOperation({ summary: 'Status da conexão WhatsApp' })
  async status() {
    return this.whatsappAdmin.getStatus();
  }

  @Get('qrcode')
  @Roles('MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Gerar QR Code para conectar WhatsApp' })
  async qrcode() {
    return this.whatsappAdmin.getQrCode();
  }

  @Post('disconnect')
  @Roles('MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Desconectar WhatsApp' })
  async disconnect() {
    await this.whatsappAdmin.disconnect();
    return { success: true };
  }
}
