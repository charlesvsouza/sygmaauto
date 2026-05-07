import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLgpdRequestDto {
  @ApiProperty({ enum: ['ACCESS', 'CORRECTION', 'DELETION', 'PORTABILITY'] })
  @IsString()
  @IsIn(['ACCESS', 'CORRECTION', 'DELETION', 'PORTABILITY'])
  requestType: string;

  @ApiProperty({ enum: ['CUSTOMER', 'USER'] })
  @IsString()
  @IsIn(['CUSTOMER', 'USER'])
  subjectType: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  requesterName: string;

  @ApiProperty()
  @IsEmail()
  requesterEmail: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
