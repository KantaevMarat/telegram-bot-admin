import { IsString, IsArray, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateScenarioDto {
  @ApiProperty({ description: 'Scenario name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Trigger (command or button id)' })
  @IsString()
  trigger: string;

  @ApiProperty({ description: 'Response text (simple scenarios)', required: false })
  @IsOptional()
  @IsString()
  response?: string;

  @ApiProperty({
    description: 'Steps array (advanced scenarios)',
    example: [
      { type: 'message', text: 'Hello {username}!' },
      { type: 'delay', ms: 1000 },
      { type: 'message', text: 'Your balance: {balance}' },
    ],
    required: false,
  })
  @IsOptional()
  @IsArray()
  steps?: any[];

  @ApiProperty({ description: 'Is active', required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({ description: 'Is active (alias)', required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
