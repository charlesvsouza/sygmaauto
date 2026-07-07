import { IsNotEmpty, IsOptional, IsString, IsEnum, IsArray, ValidateNested, Min, IsNumber, IsBoolean, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateOrUpdateItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  serviceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  partId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  internalCode?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null ? Number(value) : value))
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  type: 'service' | 'part' | 'labor';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  discount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assignedUserId?: string;
}

export class UpdateServiceOrderItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  serviceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  partId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null ? Number(value) : value))
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @ApiProperty({ required: false, enum: ['service', 'part', 'labor'] })
  @IsOptional()
  @IsString()
  type?: 'service' | 'part' | 'labor';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  discount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assignedUserId?: string;
}

export class CreateOrcamentoDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  kmEntrada?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  complaint?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrUpdateItemDto)
  items?: CreateOrUpdateItemDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  scheduledDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  equipmentBrand?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  equipmentModel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  reserveStock?: boolean;
}

export class CreateServiceOrderDto extends CreateOrcamentoDto {
  @ApiProperty({ enum: ['ORDEM_SERVICO', 'ORCAMENTO', 'RETIFICA_MOTOR'] })
  @IsOptional()
  @IsEnum(['ORDEM_SERVICO', 'ORCAMENTO', 'RETIFICA_MOTOR'])
  orderType?: 'ORDEM_SERVICO' | 'ORCAMENTO' | 'RETIFICA_MOTOR';
}

export class UpdateOrcamentoDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  complaint?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  technicalReport?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  equipmentBrand?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  equipmentModel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  reserveStock?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  scheduledDate?: string;
}

export class UpdateStatusDto {
  @ApiProperty({ enum: ['ABERTA', 'EM_DIAGNOSTICO', 'ORCAMENTO_PRONTO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'REPROVADO', 'AGUARDANDO_PECAS', 'EM_EXECUCAO', 'PRONTO_ENTREGA', 'FATURADO', 'ENTREGUE', 'CANCELADO', 'DESMONTAGEM', 'METROLOGIA', 'ORCAMENTO_RETIFICA', 'AGUARDANDO_APROVACAO_RETIFICA', 'EM_RETIFICA', 'MONTAGEM', 'TESTE_FINAL'] })
  @IsNotEmpty()
  @IsEnum(['ABERTA', 'EM_DIAGNOSTICO', 'ORCAMENTO_PRONTO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'REPROVADO', 'AGUARDANDO_PECAS', 'EM_EXECUCAO', 'PRONTO_ENTREGA', 'FATURADO', 'ENTREGUE', 'CANCELADO', 'DESMONTAGEM', 'METROLOGIA', 'ORCAMENTO_RETIFICA', 'AGUARDANDO_APROVACAO_RETIFICA', 'EM_RETIFICA', 'MONTAGEM', 'TESTE_FINAL'])
  status: string;


  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  kmSaida?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  testeRodagem?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false, description: 'Bypass de fluxo — exclusivo para ADMIN/MASTER' })
  @IsOptional()
  @IsBoolean()
  adminOverride?: boolean;
}

export class AprovarOrcamentoDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  approved: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class FinalizeOrderDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  createIncomeTransaction?: boolean;
}

export class SaveMetrologyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  empenamentoCabecote?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  empenamentoBloco?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  numeroCilindros?: number;

  @ApiProperty({ required: false, type: [Object] })
  @IsOptional()
  @IsArray()
  cilindros?: Record<string, unknown>[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  numeroMunhoes?: number;

  @ApiProperty({ required: false, type: [Object] })
  @IsOptional()
  @IsArray()
  munhoes?: Record<string, unknown>[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  numeroMoentes?: number;

  @ApiProperty({ required: false, type: [Object] })
  @IsOptional()
  @IsArray()
  moentes?: Record<string, unknown>[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  numeroMancais?: number;

  @ApiProperty({ required: false, type: [Object] })
  @IsOptional()
  @IsArray()
  mancaisBloco?: Record<string, unknown>[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  numeroBielas?: number;

  @ApiProperty({ required: false, type: [Object] })
  @IsOptional()
  @IsArray()
  bielas?: Record<string, unknown>[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tecnico?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dataLeitura?: string;
}

export class CreateDiagnosticOrderDto {
  @ApiProperty({ description: 'ID da OS reprovada — para copiar cliente e veículo' })
  @IsNotEmpty()
  @IsString()
  sourceOrderId: string;
}