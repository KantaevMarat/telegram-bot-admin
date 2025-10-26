import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FakeStatsService } from './fake-stats.service';
import { RealStatsSnapshot } from '../../entities/real-stats-snapshot.entity';
import { User } from '../../entities/user.entity';
import { Payout } from '../../entities/payout.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(RealStatsSnapshot)
    private realStatsRepo: Repository<RealStatsSnapshot>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Payout)
    private payoutRepo: Repository<Payout>,
    private fakeStatsService: FakeStatsService,
  ) {}

  /**
   * Get combined statistics (real + fake)
   */
  async getCombinedStats() {
    const realStats = await this.getRealStats();
    const fakeStats = await this.fakeStatsService.getLatestFakeStats();

    return {
      real: realStats,
      fake: {
        online: fakeStats.online,
        active: fakeStats.active,
        paid_usdt: fakeStats.paid_usdt,
        calculated_at: fakeStats.calculated_at,
      },
    };
  }

  /**
   * Get real statistics
   */
  async getRealStats() {
    const usersCount = await this.userRepo.count();

    const totalBalanceResult = await this.userRepo
      .createQueryBuilder('user')
      .select('COALESCE(SUM(user.balance_usdt), 0)', 'total')
      .getRawOne();

    const totalEarnedResult = await this.userRepo
      .createQueryBuilder('user')
      .select('COALESCE(SUM(user.total_earned), 0)', 'total')
      .getRawOne();

    const activeUsers24h = await this.userRepo
      .createQueryBuilder('user')
      .where("user.updated_at > NOW() - INTERVAL '24 hours'")
      .getCount();

    const totalPayouts = await this.payoutRepo
      .createQueryBuilder('payout')
      .where('payout.status = :status', { status: 'approved' })
      .select('COALESCE(SUM(payout.amount), 0)', 'total')
      .getRawOne();

    const pendingPayouts = await this.payoutRepo.count({
      where: { status: 'pending' },
    });

    return {
      users_count: usersCount,
      total_balance: parseFloat(totalBalanceResult?.total || '0'),
      total_earned: parseFloat(totalEarnedResult?.total || '0'),
      active_users_24h: activeUsers24h,
      total_payouts: parseFloat(totalPayouts?.total || '0'),
      pending_payouts: pendingPayouts,
    };
  }

  /**
   * Get stats history for charts
   */
  async getStatsHistory(days = 30) {
    const realHistory = await this.realStatsRepo.find({
      where: {},
      order: { taken_at: 'DESC' },
      take: days * 6, // Assuming 4 snapshots per day
    });

    const fakeHistory = await this.fakeStatsService.getFakeStatsHistory(days * 6);

    return {
      real: realHistory.reverse(),
      fake: fakeHistory.reverse(),
    };
  }

  /**
   * Get user statistics for top users
   */
  async getTopUsers(limit = 10) {
    const topByBalance = await this.userRepo.find({
      order: { balance_usdt: 'DESC' },
      take: limit,
      select: ['id', 'tg_id', 'username', 'first_name', 'balance_usdt'],
    });

    const topByEarned = await this.userRepo.find({
      order: { total_earned: 'DESC' },
      take: limit,
      select: ['id', 'tg_id', 'username', 'first_name', 'total_earned'],
    });

    const topByTasks = await this.userRepo.find({
      order: { tasks_completed: 'DESC' },
      take: limit,
      select: ['id', 'tg_id', 'username', 'first_name', 'tasks_completed'],
    });

    return {
      top_by_balance: topByBalance,
      top_by_earned: topByEarned,
      top_by_tasks: topByTasks,
    };
  }
}
