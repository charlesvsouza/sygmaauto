import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ChecklistPhotoDto {
  @IsString()
  data: string; // base64

  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class ChecklistItemDto {
  @IsString()
  area: string;

  @IsString()
  condition: string; // OK | RISCO | AMASSADO | QUEBRADO | AUSENTE

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistPhotoDto)
  photos?: ChecklistPhotoDto[];
}

export class UpsertChecklistDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(8)
  fuelLevel?: number;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsString()
  completedBy?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  items?: ChecklistItemDto[];
}
