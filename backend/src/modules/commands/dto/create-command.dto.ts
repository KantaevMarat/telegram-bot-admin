import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommandDto {
  @ApiProperty({ description: 'Command name (e.g., /mycommand)', example: '/mycommand' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Command description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Response text when command is executed' })
  @IsString()
  response: string;

  @ApiProperty({ description: 'Media URL (photo or video)', required: false })
  @IsOptional()
  @IsString()
  media_url?: string;

  @ApiProperty({ description: 'Is active', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

