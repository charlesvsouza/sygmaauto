import { Body, Controller, NotFoundException, Param, Patch, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SuperAdminGuard } from './guards/superadmin.guard';

// Recursos vendidos fora do pacote de assinatura, ligados pelo superadmin por oficina.
@Controller('superadmin/tenants')
export class SuperAdminAddonsController {
  constructor(private prisma: PrismaService) {}

  /** Libera (ou retira) o checklist de entrada/saída para uma oficina do plano START. */
  @Patch(':id/checklist-addon')
  @UseGuards(SuperAdminGuard)
  async setChecklistAddon(@Param('id') id: string, @Body() body: { enabled: boolean }) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id }, select: { id: true } });
    if (!tenant) throw new NotFoundException('Oficina não encontrada');
    return this.prisma.tenant.update({
      where: { id },
      data: { checklistAddon: Boolean(body?.enabled) },
      select: { id: true, checklistAddon: true },
    });
  }
}
