import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty({ description: 'Telegram ID', example: '123456789' })
  @IsString()
  @IsNotEmpty()
  tg_id: string;

  @ApiProperty({ description: 'Role', example: 'admin', required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ description: 'Username', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: 'First name', required: false })
  @IsOptional()
  @IsString()
  first_name?: string;
}
