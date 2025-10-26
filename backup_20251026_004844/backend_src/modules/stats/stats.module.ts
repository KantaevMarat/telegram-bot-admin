import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { FakeStatsService } from './fake-stats.service';
import { FakeStats } from '../../entities/fake-stats.entity';
import { RealStatsSnapshot } from '../../entities/real-stats-snapshot.entity';
import { User } from '../../entities/user.entity';
import { Payout } from '../../entities/payout.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FakeStats, RealStatsSnapshot, User, Payout])],
  controllers: [StatsController],
  providers: [StatsService, FakeStatsService],
  exports: [StatsService, FakeStatsService],
})
export class StatsModule {}

