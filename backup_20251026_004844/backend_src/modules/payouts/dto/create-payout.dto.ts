import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePayoutDto {
  @ApiProperty({ description: 'Amount to withdraw', example: 50 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Withdrawal method', example: 'crypto' })
  @IsString()
  method: string;

  @ApiProperty({
    description: 'Method details (account, wallet address, etc.)',
    required: false,
  })
  @IsOptional()
  @IsString()
  method_details?: string;
}

