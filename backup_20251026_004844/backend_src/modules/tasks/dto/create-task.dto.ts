import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ description: 'Task title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Task description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Minimum reward' })
  @IsNumber()
  @Min(0)
  reward_min: number;

  @ApiProperty({ description: 'Maximum reward' })
  @IsNumber()
  @Min(0)
  reward_max: number;

  @ApiProperty({ description: 'Media URL', required: false })
  @IsOptional()
  @IsString()
  media_url?: string;

  @ApiProperty({ description: 'Media type', required: false })
  @IsOptional()
  @IsString()
  media_type?: string;

  @ApiProperty({ description: 'Max completions per user', required: false })
  @IsOptional()
  @IsNumber()
  max_per_user?: number;

  @ApiProperty({ description: 'Action URL', required: false })
  @IsOptional()
  @IsString()
  action_url?: string;

  @ApiProperty({ description: 'Cooldown in hours', required: false })
  @IsOptional()
  @IsNumber()
  cooldown_hours?: number;

  @ApiProperty({ description: 'Is active', required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

