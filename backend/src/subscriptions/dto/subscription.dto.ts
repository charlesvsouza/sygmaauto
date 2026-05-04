import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const PLAN_NAMES = ['START', 'PRO', 'REDE', 'RETIFICA_PRO', 'RETIFICA_REDE'] as const;
type SubscriptionPlanName = (typeof PLAN_NAMES)[number];

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMIANNUAL = 'SEMIANNUAL',
  ANNUAL = 'ANNUAL',
}

export class ChangePlanDto {
  @ApiProperty({ enum: PLAN_NAMES })
  @IsNotEmpty()
  @IsEnum(PLAN_NAMES)
  plan: SubscriptionPlanName;
}

export class CreateCheckoutDto {
  @ApiProperty({ enum: PLAN_NAMES })
  @IsNotEmpty()
  @IsEnum(PLAN_NAMES)
  plan: SubscriptionPlanName;

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
  @ApiProperty({ enum: PLAN_NAMES })
  @IsNotEmpty()
  @IsEnum(PLAN_NAMES)
  plan: SubscriptionPlanName;

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