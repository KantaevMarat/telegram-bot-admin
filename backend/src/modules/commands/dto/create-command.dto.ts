import { IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommandDto {
  @ApiProperty({ description: 'Command name (e.g., /mycommand)', example: '/mycommand' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Command description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Response text when command is executed (legacy, for backward compatibility)', required: false })
  @IsOptional()
  @IsString()
  response?: string;

  @ApiProperty({ description: 'Media URL (photo or video) (legacy, for backward compatibility)', required: false })
  @IsOptional()
  @IsString()
  media_url?: string;

  @ApiProperty({ description: 'Action type: text, media, url, function, command', required: false, default: 'text' })
  @IsOptional()
  @IsString()
  action_type?: string;

  @ApiProperty({ description: 'Action payload (can be string or object depending on action type)', required: false })
  @IsOptional()
  action_payload?: any;

  @ApiProperty({ description: 'Is active', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

