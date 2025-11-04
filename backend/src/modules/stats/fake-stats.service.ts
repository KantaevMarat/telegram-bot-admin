import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
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
   * Cron job that runs every hour to update fake statistics
   */
  @Cron('0 * * * *')
  async updateFakeStatsCron(): Promise<void> {
    this.logger.log('🔄 Running fake stats update (cron)...');
    try {
      await this.generateAndSaveFakeStats();
    } catch (error) {
      this.logger.error('❌ Error updating fake stats:', error);
    }
  }

  /**
   * Manually regenerate fake stats
   */
  async regenerateFakeStats(): Promise<FakeStats> {
    try {
      this.logger.log('🔄 Manually regenerating fake stats...');
      return await this.generateAndSaveFakeStats();
    } catch (error) {
      this.logger.error('❌ Error regenerating fake stats:', error);
      this.logger.error('Stack trace:', error.stack);
      throw error;
    }
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
   * Initialize fake stats with default values if database is empty
   */
  private async initializeFakeStats(): Promise<FakeStats> {
    const realStats = await this.getRealStats();

    // Use default values if database is empty (new project)
    const defaultValues = {
      online: 1250,
      active: 8420,
      paid_usdt: 45678.5,
    };

    // If real stats are empty, use default values; otherwise calculate from real stats
    const online = realStats.users_count > 0
      ? Math.round(realStats.users_count * 0.8) // 80% of users "online"
      : defaultValues.online;
    
    const active = realStats.users_count > 0
      ? Math.round(realStats.users_count * 1.2) // 120% to show growth
      : defaultValues.active;
    
    const paid_usdt = realStats.total_earned > 0
      ? realStats.total_earned * 1.15 // 15% more to look impressive
      : defaultValues.paid_usdt;

    const fakeStats = this.fakeStatsRepo.create({
      online,
      active,
      paid_usdt,
    });

    await this.fakeStatsRepo.save(fakeStats);
    this.logger.log('✅ Initialized fake stats', { online, active, paid_usdt });

    return fakeStats;
  }

  /**
   * Generate and save new fake stats using smooth random walk algorithm
   */
  private async generateAndSaveFakeStats(): Promise<FakeStats> {
    this.logger.log('Step 1: Getting real stats...');
    const realStats = await this.getRealStats();
    this.logger.log(`Real stats: users=${realStats.users_count}, earned=${realStats.total_earned}`);
    
    this.logger.log('Step 2: Saving real stats snapshot...');
    await this.saveRealStatsSnapshot(realStats);

    this.logger.log('Step 3: Getting latest fake stats...');
    const previousFake = await this.getLatestFakeStats();
    this.logger.log(`Previous fake stats: online=${previousFake.online}, active=${previousFake.active}`);

    // If database is empty (no real users), use default values with large random variations
    if (realStats.users_count === 0) {
      const defaultValues = {
        online: 1250 + Math.floor(Math.random() * 600 - 300), // ±300 (950-1550)
        active: 8420 + Math.floor(Math.random() * 2000 - 1000), // ±1000 (7420-9420)
        paid_usdt: 45678.5 + (Math.random() * 6000 - 3000), // ±3000 (42678-48678)
      };

      const newFakeStats = this.fakeStatsRepo.create({
        online: Math.max(800, defaultValues.online), // minimum 800
        active: Math.max(5000, defaultValues.active), // minimum 5000
        paid_usdt: Math.max(35000, Math.round(defaultValues.paid_usdt * 100) / 100), // minimum 35000
      });

      await this.fakeStatsRepo.save(newFakeStats);
      this.logger.log(`✅ Fake stats updated (default values): online=${newFakeStats.online}, active=${newFakeStats.active}, paid=${newFakeStats.paid_usdt}`);
      
      return newFakeStats;
    }

    // Configuration parameters - increased for more noticeable changes
    const maxDeltaPercent = this.configService.get<number>('FAKE_STATS_MAX_DELTA_PERCENT', 30);
    const trendMin = this.configService.get<number>('FAKE_STATS_TREND_MIN', -0.08);
    const trendMax = this.configService.get<number>('FAKE_STATS_TREND_MAX', 0.12);
    const noiseStdDev = this.configService.get<number>('FAKE_STATS_NOISE_STDDEV', 0.05);

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
    const paidTrendMax = trendMax * 2; // Allow higher growth for paid (increased from 1.5 to 2)

    const newFakePaid = this.smoothRandomWalk(
      previousFake.paid_usdt,
      realStats.total_earned,
      maxDeltaPercent,
      paidTrendMin,
      paidTrendMax,
      noiseStdDev * 1.2, // Increased volatility for more noticeable changes
      true, // Only allow growth for paid stats
    );

    // Use default values if result is NaN (happens when database is empty)
    const defaultValues = {
      online: 1250,
      active: 8420,
      paid_usdt: 45678.5,
    };

    const newFakeStats = this.fakeStatsRepo.create({
      online: Math.round(isNaN(newFakeOnline) ? defaultValues.online : newFakeOnline),
      active: Math.round(isNaN(newFakeActive) ? defaultValues.active : newFakeActive),
      paid_usdt: isNaN(newFakePaid) ? defaultValues.paid_usdt : Math.round(newFakePaid * 100) / 100,
    });

    await this.fakeStatsRepo.save(newFakeStats);
    this.logger.log(`✅ Fake stats updated: online=${newFakeStats.online}, active=${newFakeStats.active}, paid=${newFakeStats.paid_usdt}`);

    return newFakeStats;
  }

  /**
   * Smooth random walk algorithm for generating realistic stats progression
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
    // Calculate target range (±maxDeltaPercent from real value)
    // If realValue is 0 or very small, use previousValue as base for variation
    const baseValue = realValue > 0 ? realValue : previousValue;
    const targetMin = baseValue * (1 - maxDeltaPercent / 100);
    const targetMax = baseValue * (1 + maxDeltaPercent / 100);

    // Generate trend (more significant drift towards target)
    const trend = this.randomUniform(trendMin, trendMax);
    const target = (targetMin + targetMax) / 2;
    
    // Increased drift speed for more noticeable changes (was 0.1, now 0.3)
    const drift = (target - previousValue) * 0.3;
    
    // Add more significant noise
    const noise = this.randomGaussian(0, noiseStdDev * previousValue);
    
    // Add additional random variation for more noticeable changes (±2-5% of previous value)
    const additionalVariation = previousValue * this.randomUniform(-0.05, 0.05);

    // Calculate new value
    let newValue = previousValue + drift + trend * previousValue + noise + additionalVariation;

    // Clamp to target range
    newValue = this.clamp(newValue, targetMin, targetMax);

    // Ensure minimum change of at least 1-3% to make it noticeable
    const minChange = previousValue * 0.01;
    const actualChange = Math.abs(newValue - previousValue);
    if (actualChange < minChange && !onlyGrowth) {
      // Force a noticeable change
      const direction = Math.random() > 0.5 ? 1 : -1;
      newValue = previousValue + direction * this.randomUniform(minChange, minChange * 3);
      newValue = this.clamp(newValue, targetMin, targetMax);
    }

    // If only growth, ensure it's not less than previous
    if (onlyGrowth && newValue < previousValue) {
      newValue = previousValue * (1 + Math.abs(noise) * 0.5 + Math.random() * 0.02); // Small growth
      newValue = this.clamp(newValue, previousValue, targetMax);
    }

    return newValue;
  }

  /**
   * Get real statistics from database
   */
  private async getRealStats(): Promise<{ users_count: number; total_earned: number }> {
    const usersCount = await this.userRepo.count();

    const totalEarnedResult = await this.userRepo
      .createQueryBuilder('user')
      .select('COALESCE(SUM(user.total_earned), 0)', 'total')
      .getRawOne();

    const totalEarned = parseFloat(totalEarnedResult?.total || '0');

    return {
      users_count: usersCount,
      total_earned: totalEarned,
    };
  }

  /**
   * Save snapshot of real stats
   */
  private async saveRealStatsSnapshot(realStats: { users_count: number; total_earned: number }): Promise<void> {
    const snapshot = this.realStatsRepo.create({
      users_count: realStats.users_count,
      total_earned: realStats.total_earned,
    });

    await this.realStatsRepo.save(snapshot);
  }

  /**
   * Generate uniform random number
   */
  private randomUniform(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  /**
   * Generate Gaussian (normal) random number using Box-Muller transform
   */
  private randomGaussian(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /**
   * Clamp value between min and max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

