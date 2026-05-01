import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class SuperAdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class CreateSuperAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @MinLength(12)
  password: string;

  @IsString()
  @IsNotEmpty()
  bootstrapSecret: string; // segredo de ambiente para criar o primeiro super admin
}

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
