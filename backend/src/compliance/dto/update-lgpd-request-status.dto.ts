import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateLgpdRequestStatusDto {
  @ApiProperty({ enum: ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'] })
  @IsString()
  @IsIn(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'])
  status: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
