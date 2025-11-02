import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChannelDto {
  @ApiProperty({ description: 'Channel ID or username (e.g., @channelname or -1001234567890)' })
  @IsString()
  @IsNotEmpty()
  channel_id: string;

  @ApiProperty({ description: 'Channel title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Channel username without @', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: 'Channel URL', required: false })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({ description: 'Is channel check active', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

