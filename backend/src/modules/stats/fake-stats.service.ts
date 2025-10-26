import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { FakeStats } from '../../entities/fake-stats.entity';
import { RealStatsSnapshot } from '../../entities/real-stats-snapshot.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class FakeStatsService {
  private readonly logger = new Logger(FakeStatsService.name);

  constructor(
    @InjectRepository(FakeStats)
    private fakeStatsRepo: Repository<FakeStats>,
    @InjectRepository(RealStatsSnapshot)
    private realStatsRepo: Repository<RealStatsSnapshot>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private configService: ConfigService,
  ) {}

  /**
   * Cron job that runs every 4 hours to update fake statistics
   */
  @Cron('0 * * * *') // Every hour
  async updateFakeStatsCron() {
    this.logger.log('🔄 Running fake stats update (cron)...');
    await this.generateAndSaveFakeStats();
  }

  /**
   * Manual trigger for fake stats regeneration
   */
  async regenerateFakeStats() {
    this.logger.log('🔄 Manually regenerating fake stats...');
    return await this.generateAndSaveFakeStats();
  }

  /**
   * Get latest fake stats
   */
  async getLatestFakeStats(): Promise<FakeStats> {
    let latest = await this.fakeStatsRepo
      .createQueryBuilder('fake_stats')
      .orderBy('fake_stats.calculated_at', 'DESC')
      .limit(1)
      .getOne();

    if (!latest) {
      // Initialize fake stats if none exist
      latest = await this.initializeFakeStats();
    }

    return latest;
  }

  /**
   * Get fake stats history
   */
  async getFakeStatsHistory(limit = 100): Promise<FakeStats[]> {
    return await this.fakeStatsRepo.find({
      order: { calculated_at: 'DESC' },
      take: limit,
    });
  }

  /**
   * Initialize fake stats based on real stats
   */
  private async initializeFakeStats(): Promise<FakeStats> {
    const realStats = await this.getRealStats();

    const fakeStats = this.fakeStatsRepo.create({
      online: Math.round(realStats.users_count * 0.8), // 80% of users "online"
      active: Math.round(realStats.users_count * 1.2), // 120% to show growth
      paid_usdt: realStats.total_earned * 1.15, // 15% more to look impressive
    });

    await this.fakeStatsRepo.save(fakeStats);
    this.logger.log('✅ Initialized fake stats');

    return fakeStats;
  }

  /**
   * Generate and save new fake stats using smooth random walk algorithm
   */
  private async generateAndSaveFakeStats(): Promise<FakeStats> {
    const realStats = await this.getRealStats();
    await this.saveRealStatsSnapshot(realStats);

    const previousFake = await this.getLatestFakeStats();

    // Configuration parameters
    const maxDeltaPercent = this.configService.get<number>('FAKE_STATS_MAX_DELTA_PERCENT', 15);
    const trendMin = this.configService.get<number>('FAKE_STATS_TREND_MIN', -0.02);
    const trendMax = this.configService.get<number>('FAKE_STATS_TREND_MAX', 0.03);
    const noiseStdDev = this.configService.get<number>('FAKE_STATS_NOISE_STDDEV', 0.01);

    // Generate new fake stats using smooth random walk
    const newFakeOnline = this.smoothRandomWalk(
      previousFake.online,
      realStats.users_count,
      maxDeltaPercent,
      trendMin,
      trendMax,
      noiseStdDev,
    );

    const newFakeActive = this.smoothRandomWalk(
      previousFake.active,
      realStats.users_count,
      maxDeltaPercent,
      trendMin,
      trendMax,
      noiseStdDev,
    );

    // For paid_usdt, prefer growth (70% chance of positive trend)
    const paidTrendMin = Math.random() < 0.7 ? 0 : trendMin;
    const paidTrendMax = trendMax * 1.5; // Allow slightly higher growth for paid

    const newFakePaid = this.smoothRandomWalk(
      previousFake.paid_usdt,
      realStats.total_earned,
      maxDeltaPercent,
      paidTrendMin,
      paidTrendMax,
      noiseStdDev * 0.5, // Less volatility for money
      true, // Only allow growth for paid stats
    );

    const newFakeStats = this.fakeStatsRepo.create({
      online: Math.round(newFakeOnline),
      active: Math.round(newFakeActive),
      paid_usdt: Math.round(newFakePaid * 100) / 100, // Round to 2 decimals
    });

    await this.fakeStatsRepo.save(newFakeStats);

    this.logger.log(
      `✅ Fake stats updated: online=${newFakeStats.online}, active=${newFakeStats.active}, paid=${newFakeStats.paid_usdt}`,
    );

    return newFakeStats;
  }

  /**
   * Smooth random walk algorithm
   * Formula: new_value = clamp(previous * (1 + drift + noise + seasonal), min, max)
   */
  private smoothRandomWalk(
    previousValue: number,
    realValue: number,
    maxDeltaPercent: number,
    trendMin: number,
    trendMax: number,
    noiseStdDev: number,
    onlyGrowth = false,
  ): number {
    // Random drift (trend component)
    const drift = this.randomUniform(trendMin, trendMax);

    // Gaussian noise
    const noise = this.randomGaussian(0, noiseStdDev);

    // Seasonal component (sin wave based on hour of day)
    const hour = new Date().getHours();
    const seasonal = Math.sin((hour * Math.PI) / 12) * 0.01; // ±1% seasonal variation

    // Calculate new value
    let multiplier = 1 + drift + noise + seasonal;

    // If only growth is allowed, ensure multiplier >= 1
    if (onlyGrowth && multiplier < 1) {
      multiplier = 1 + Math.abs(drift) * 0.5 + Math.abs(noise) * 0.5;
    }

    let newValue = previousValue * multiplier;

    // Apply bounds: stay within ±maxDeltaPercent of real value
    const minBound = realValue * (1 - maxDeltaPercent / 100);
    const maxBound = realValue * (1 + maxDeltaPercent / 100);

    newValue = this.clamp(newValue, minBound, maxBound);

    return newValue;
  }

  /**
   * Get current real statistics
   */
  private async getRealStats() {
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

    return {
      users_count: usersCount || 0,
      total_balance: parseFloat(totalBalanceResult?.total || '0'),
      total_earned: parseFloat(totalEarnedResult?.total || '0'),
      active_users_24h: activeUsers24h || 0,
    };
  }

  /**
   * Save real stats snapshot for history
   */
  private async saveRealStatsSnapshot(realStats: any) {
    const snapshot = this.realStatsRepo.create(realStats);
    await this.realStatsRepo.save(snapshot);
  }

  /**
   * Utility: Random uniform distribution
   */
  private randomUniform(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  /**
   * Utility: Random Gaussian (normal) distribution (Box-Muller transform)
   */
  private randomGaussian(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Utility: Clamp value between min and max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
