import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BalanceLog } from '../../entities/balance-log.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class BalanceService {
  constructor(
    @InjectRepository(BalanceLog)
    private balanceLogRepo: Repository<BalanceLog>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async getBalanceOverview() {
    const totalBalance = await this.userRepo
      .createQueryBuilder('user')
      .select('COALESCE(SUM(user.balance_usdt), 0)', 'total')
      .getRawOne();

    const totalEarned = await this.userRepo
      .createQueryBuilder('user')
      .select('COALESCE(SUM(user.total_earned), 0)', 'total')
      .getRawOne();

    const topUsers = await this.userRepo.find({
      order: { balance_usdt: 'DESC' },
      take: 10,
      select: ['id', 'tg_id', 'username', 'first_name', 'balance_usdt'],
    });

    return {
      total_balance: parseFloat(totalBalance?.total || '0'),
      total_earned: parseFloat(totalEarned?.total || '0'),
      top_users: topUsers,
    };
  }

  async getBalanceLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [logs, total] = await this.balanceLogRepo.findAndCount({
      relations: ['user'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

