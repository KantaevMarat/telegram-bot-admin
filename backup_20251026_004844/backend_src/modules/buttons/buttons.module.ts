import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ButtonsService } from './buttons.service';
import { ButtonsController } from './buttons.controller';
import { Button } from '../../entities/button.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Button])],
  controllers: [ButtonsController],
  providers: [ButtonsService],
  exports: [ButtonsService],
})
export class ButtonsModule {}

