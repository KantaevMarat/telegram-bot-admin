import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Command } from '../../entities/command.entity';
import { CommandsService } from './commands.service';
import { CommandsController } from './commands.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Command])],
  controllers: [CommandsController],
  providers: [CommandsService],
  exports: [CommandsService],
})
export class CommandsModule {}

