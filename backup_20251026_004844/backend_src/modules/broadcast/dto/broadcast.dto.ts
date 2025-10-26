import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BroadcastDto {
  @ApiProperty({ description: 'Broadcast message text' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ description: 'Media URLs', required: false })
  @IsOptional()
  @IsArray()
  media_urls?: string[];

  @ApiProperty({ description: 'Batch size', required: false, default: 30 })
  @IsOptional()
  @IsNumber()
  batchSize?: number;

  @ApiProperty({ description: 'Throttle delay in ms', required: false, default: 1000 })
  @IsOptional()
  @IsNumber()
  throttle?: number;
}

