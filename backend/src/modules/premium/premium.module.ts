import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PremiumService } from './premium.service';
import { PremiumController } from './premium.controller';
import { PremiumRequest } from '../../entities/premium-request.entity';
import { User } from '../../entities/user.entity';
import { BalanceLog } from '../../entities/balance-log.entity';
import { RanksModule } from '../ranks/ranks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PremiumRequest, User, BalanceLog]),
    forwardRef(() => RanksModule),
  ],
  controllers: [PremiumController],
  providers: [PremiumService],
  exports: [PremiumService],
})
export class PremiumModule {}

