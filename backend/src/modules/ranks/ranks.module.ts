import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RanksService } from './ranks.service';
import { RanksController } from './ranks.controller';
import { UserRank } from '../../entities/user-rank.entity';
import { RankSettings } from '../../entities/rank-settings.entity';
import { User } from '../../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserRank, RankSettings, User]),
  ],
  controllers: [RanksController],
  providers: [RanksService],
  exports: [RanksService],
})
export class RanksModule {}

