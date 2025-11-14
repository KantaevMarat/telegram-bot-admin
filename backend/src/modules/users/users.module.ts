import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../../entities/user.entity';
import { BalanceLog } from '../../entities/balance-log.entity';
import { Payout } from '../../entities/payout.entity';
import { BotModule } from '../bot/bot.module';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, BalanceLog, Payout]),
    forwardRef(() => BotModule),
    forwardRef(() => StatsModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
