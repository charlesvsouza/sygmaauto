import { IsNotEmpty, IsOptional, IsString, IsNumber, IsInt, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTenantDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  laborHourlyRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  companyType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  legalNature?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tradeName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  stateRegistration?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  municipalRegistration?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  whatsappMetaPhoneNumberId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  whatsappDisplayNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  diagnosticHours?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  defaultCommissionPercent?: number;
}

export class UpdateDiscountSettingsDto {
  @ApiProperty({ required: false, description: 'Desconto máximo (%) que o GERENTE pode aplicar em peças' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxDiscountPercentParts?: number;

  @ApiProperty({ required: false, description: 'Desconto máximo (%) que o GERENTE pode aplicar em serviços/mão de obra' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxDiscountPercentServices?: number;
}
export class UpdateDocumentSettingsDto {
  @ApiProperty({ required: false, description: 'Garantia dos serviços, em dias' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3650)
  warrantyDaysServices?: number;

  @ApiProperty({ required: false, description: 'Garantia das peças, em dias' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3650)
  warrantyDaysParts?: number;

  @ApiProperty({ required: false, description: 'Validade do orçamento (e do link de aprovação), em dias' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  budgetValidityDays?: number;

  @ApiProperty({ required: false, description: 'Texto de autorização do orçamento (vazio = padrão)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  authorizationText?: string;

  @ApiProperty({ required: false, description: 'Texto de garantia; {servicos} e {pecas} viram os prazos (vazio = padrão)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  warrantyText?: string;

  @ApiProperty({ required: false, description: 'Responsabilidade por objetos deixados no veículo (vazio = padrão)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  belongingsText?: string;
}
