import { IsString, IsArray, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateScenarioDto {
  @ApiProperty({ description: 'Scenario name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Trigger (command or button id)' })
  @IsString()
  trigger: string;

  @ApiProperty({
    description: 'Steps array',
    example: [
      { type: 'message', text: 'Hello {username}!' },
      { type: 'delay', ms: 1000 },
      { type: 'message', text: 'Your balance: {balance}' },
    ],
  })
  @IsArray()
  steps: any[];

  @ApiProperty({ description: 'Is active', required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

