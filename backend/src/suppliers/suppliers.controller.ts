import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// Cadastro de fornecedores é atividade administrativa; leitura segue liberada
// para quem acessa o sistema (peças/reservas exibem o fornecedor).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.suppliersService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.suppliersService.findOne(req.user.tenantId, id);
  }

  @Post()
  @Roles('MASTER', 'ADMIN', 'SECRETARIA', 'CHEFE_OFICINA')
  create(@Request() req: any, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  @Roles('MASTER', 'ADMIN', 'SECRETARIA', 'CHEFE_OFICINA')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('MASTER', 'ADMIN')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.suppliersService.remove(req.user.tenantId, id);
  }
}
