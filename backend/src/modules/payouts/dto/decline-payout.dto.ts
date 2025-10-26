import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeclinePayoutDto {
  @ApiProperty({
    description: 'Reason for declining the payout',
    example: 'Invalid payment details',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
