import { IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBalanceDto {
  @ApiProperty({ description: 'Amount to add or subtract', example: 10.5 })
  @IsNumber()
  delta: number;

  @ApiProperty({ description: 'Reason for balance change', example: 'manual_adjustment' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Comment', required: false })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ description: 'Admin Telegram ID', required: false })
  @IsOptional()
  @IsString()
  adminTgId?: string;
}

