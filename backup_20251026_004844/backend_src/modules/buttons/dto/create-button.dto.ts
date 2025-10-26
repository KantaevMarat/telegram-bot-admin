import { IsString, IsNumber, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateButtonDto {
  @ApiProperty({ description: 'Button label' })
  @IsString()
  label: string;

  @ApiProperty({ description: 'Action type', example: 'open_url' })
  @IsString()
  action_type: string;

  @ApiProperty({ description: 'Action payload', example: { url: 'https://example.com' } })
  @IsObject()
  action_payload: any;

  @ApiProperty({ description: 'Row position', required: false })
  @IsOptional()
  @IsNumber()
  row?: number;

  @ApiProperty({ description: 'Column position', required: false })
  @IsOptional()
  @IsNumber()
  col?: number;

  @ApiProperty({ description: 'Media URL', required: false })
  @IsOptional()
  @IsString()
  media_url?: string;

  @ApiProperty({ description: 'Is active', required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

