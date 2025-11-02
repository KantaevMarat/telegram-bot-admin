import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotService } from './bot.service';
import { AdminBotService } from './admin-bot.service';
import { BotController } from './bot.controller';
import { User } from '../../entities/user.entity';
import { Admin } from '../../entities/admin.entity';
import { Button } from '../../entities/button.entity';
import { Task } from '../../entities/task.entity';
import { UserTask } from '../../entities/user-task.entity';
import { Message } from '../../entities/message.entity';
import { Scenario } from '../../entities/scenario.entity';
import { FakeStats } from '../../entities/fake-stats.entity';
import { Settings } from '../../entities/settings.entity';
import { UsersModule } from '../users/users.module';
import { StatsModule } from '../stats/stats.module';
import { SettingsModule } from '../settings/settings.module';
import { MessagesModule } from '../messages/messages.module';
import { ChannelsModule } from '../channels/channels.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Admin,
      Button,
      Task,
      UserTask,
      Message,
      Scenario,
      FakeStats,
      Settings,
    ]),
    UsersModule,
    StatsModule,
    SettingsModule,
    forwardRef(() => MessagesModule),
    ChannelsModule,
  ],
  controllers: [BotController],
  providers: [BotService, AdminBotService],
  exports: [BotService, AdminBotService],
})
export class BotModule {}
