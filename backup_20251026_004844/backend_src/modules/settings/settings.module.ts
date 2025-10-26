import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { Settings } from '../../entities/settings.entity';
import { SettingsHistory } from '../../entities/settings-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Settings, SettingsHistory])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}

