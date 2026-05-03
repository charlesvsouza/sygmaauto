import { IsNotEmpty, IsOptional, IsString, IsInt, Min, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVehicleDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  plate: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  brand: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  model: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1900)
  year?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  vin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  km?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  // Manutenção Preventiva
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  lastMaintenanceKm?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  lastMaintenanceDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  maintenanceIntervalKm?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  maintenanceIntervalDays?: number;
}

export class UpdateVehicleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  plate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1900)
  year?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  vin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  km?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  // Manutenção Preventiva
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  lastMaintenanceKm?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  lastMaintenanceDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  maintenanceIntervalKm?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  maintenanceIntervalDays?: number;
}