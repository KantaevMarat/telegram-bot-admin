import { IsString, IsNumber, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateButtonDto {
  @ApiProperty({ description: 'Button label', required: false })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ description: 'Action type', example: 'open_url' })
  @IsString()
  action_type: string;

  @ApiProperty({ description: 'Action payload', example: { url: 'https://example.com' } })
  @IsOptional()
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

  @ApiProperty({ description: 'Command to execute when button is clicked (e.g., /start)', required: false })
  @IsOptional()
  @IsString()
  command?: string;

  @ApiProperty({ description: 'Is active', required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ description: 'Admin only button', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  admin_only?: boolean;
}
