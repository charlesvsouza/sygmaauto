import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMIANNUAL = 'SEMIANNUAL',
  ANNUAL = 'ANNUAL',
}

export class ChangePlanDto {
  @ApiProperty({ enum: ['START', 'PRO', 'REDE'] })
  @IsNotEmpty()
  @IsEnum(['START', 'PRO', 'REDE'])
  plan: 'START' | 'PRO' | 'REDE';
}

export class CreateCheckoutDto {
  @ApiProperty({ enum: ['START', 'PRO', 'REDE'] })
  @IsNotEmpty()
  @IsEnum(['START', 'PRO', 'REDE'])
  plan: 'START' | 'PRO' | 'REDE';

  @ApiProperty({ enum: BillingCycle, required: false, default: BillingCycle.MONTHLY })
  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @ApiProperty({ required: false, description: 'URL de sucesso após pagamento' })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiProperty({ required: false, description: 'URL de cancelamento/retorno' })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

export class PublicCheckoutDto {
  @ApiProperty({ enum: ['START', 'PRO', 'REDE'] })
  @IsNotEmpty()
  @IsEnum(['START', 'PRO', 'REDE'])
  plan: 'START' | 'PRO' | 'REDE';

  @ApiProperty({ enum: BillingCycle })
  @IsNotEmpty()
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @ApiProperty({ description: 'Nome da oficina/empresa para cadastro inicial' })
  @IsNotEmpty()
  @IsString()
  tenantName: string;

  @ApiProperty({ description: 'Email que receberá o convite de ativação do MASTER' })
  @IsNotEmpty()
  @IsString()
  inviteEmail: string;

  @ApiProperty({ required: false, description: 'Documento da empresa (CNPJ/CPF)' })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiProperty({ required: false, description: 'URL de sucesso após pagamento' })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiProperty({ required: false, description: 'URL de cancelamento/retorno' })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}