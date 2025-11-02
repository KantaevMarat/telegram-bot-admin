import { IsString, IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'Message text', required: false })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.media_url || o.text)
  @IsNotEmpty({ message: 'Text is required when media_url is not provided' })
  text?: string;

  @ApiProperty({ description: 'Media URL', required: false })
  @IsOptional()
  @IsString()
  media_url?: string;
}
