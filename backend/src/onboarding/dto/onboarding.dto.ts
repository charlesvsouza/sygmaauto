import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class ProvisionTenantDto {
  @IsString()
  @IsNotEmpty()
  tenantName: string;

  @IsEmail()
  inviteEmail: string;

  @IsOptional()
  @IsString()
  planName?: string;

  @IsOptional()
  @IsString()
  document?: string;
}

export class CompleteTenantSetupDto {
  @IsString()
  @IsNotEmpty()
  masterName: string;

  @IsEmail()
  masterEmail: string;

  @IsOptional()
  @IsEmail()
  recoveryEmail?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  tenantName: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  companyType?: string;

  @IsOptional()
  @IsString()
  legalNature?: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsOptional()
  @IsString()
  stateRegistration?: string;

  @IsOptional()
  @IsString()
  municipalRegistration?: string;
}
