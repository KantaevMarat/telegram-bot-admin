import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { BotModule } from './modules/bot/bot.module';
import { UsersModule } from './modules/users/users.module';
import { StatsModule } from './modules/stats/stats.module';
import { MediaModule } from './modules/media/media.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ButtonsModule } from './modules/buttons/buttons.module';
import { ScenariosModule } from './modules/scenarios/scenarios.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { BalanceModule } from './modules/balance/balance.module';
import { SettingsModule } from './modules/settings/settings.module';
import { BroadcastModule } from './modules/broadcast/broadcast.module';
import { SyncModule } from './modules/sync/sync.module';
import { typeOrmConfig } from './config/typeorm.config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => typeOrmConfig(configService),
      inject: [ConfigService],
    }),

    // Scheduler for cron jobs
    ScheduleModule.forRoot(),

    // BullMQ for queues
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),

    // Sync module (MUST be before feature modules to ensure global availability)
    SyncModule,

    // Feature modules
    AuthModule,
    AdminModule,
    BotModule,
    UsersModule,
    StatsModule,
    MediaModule,
    MessagesModule,
    ButtonsModule,
    ScenariosModule,
    TasksModule,
    PayoutsModule,
    BalanceModule,
    SettingsModule,
    BroadcastModule,
  ],
})
export class AppModule {}
