import { IsEmail, IsNotEmpty, IsOptional, IsString, IsEnum, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsEmail()
  @IsString()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: UserRole, required: false, default: 'PRODUTIVO' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ required: false })
  @IsOptional()
  isActive?: boolean;
}

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ enum: UserRole, required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;


  @ApiProperty({ required: false })
  @IsOptional()
  isActive?: boolean;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}