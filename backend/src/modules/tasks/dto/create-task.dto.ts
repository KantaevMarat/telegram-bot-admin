import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateTaskDto {
  @ApiProperty({ description: 'Task title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Task description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Minimum reward' })
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  reward_min: number;

  @ApiProperty({ description: 'Maximum reward' })
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @Type(() => Number)
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
  @Transform(({ value }) => (value !== undefined && typeof value === 'string' ? parseInt(value) : value))
  @Type(() => Number)
  @IsNumber()
  max_per_user?: number;

  @ApiProperty({ description: 'Action URL', required: false })
  @IsOptional()
  @IsString()
  action_url?: string;

  @ApiProperty({ description: 'Telegram channel ID for subscription check', required: false })
  @IsOptional()
  @IsString()
  channel_id?: string;

  @ApiProperty({ description: 'Task type: subscription, action, manual', required: false })
  @IsOptional()
  @IsString()
  task_type?: string;

  @ApiProperty({ description: 'Command to execute task (e.g., /start_task)', required: false })
  @IsOptional()
  @IsString()
  command?: string;

  @ApiProperty({ description: 'Minimum completion time in minutes', required: false })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined && typeof value === 'string' ? parseInt(value) : value))
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_completion_time?: number;

  @ApiProperty({ description: 'Cooldown in hours', required: false })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined && typeof value === 'string' ? parseInt(value) : value))
  @Type(() => Number)
  @IsNumber()
  cooldown_hours?: number;

  @ApiProperty({ description: 'Is active', required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
