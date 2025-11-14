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

    // Default values for fake stats
    const defaultValues = {
      online: 1250,
      active: 8420,
      paid_usdt: 45678.5,
    };

    // If previous fake stats are too small (corrupted/invalid), use default values
    // This happens when database was initialized with wrong values
    const useDefaultOnline = previousFake.online < 100;
    const useDefaultActive = previousFake.active < 100;
    const useDefaultPaid = previousFake.paid_usdt < 1000;

    const baseOnline = useDefaultOnline ? defaultValues.online : previousFake.online;
    const baseActive = useDefaultActive ? defaultValues.active : previousFake.active;
    const basePaid = useDefaultPaid ? defaultValues.paid_usdt : previousFake.paid_usdt;

    if (useDefaultOnline || useDefaultActive || useDefaultPaid) {
      this.logger.warn(
        `⚠️ Previous fake stats are too small (online=${previousFake.online}, active=${previousFake.active}, paid=${previousFake.paid_usdt}). ` +
        `Using default values as base (online=${baseOnline}, active=${baseActive}, paid=${basePaid})`
      );
    }

    // Configuration parameters - increased for more noticeable changes
    const maxDeltaPercent = this.configService.get<number>('FAKE_STATS_MAX_DELTA_PERCENT', 30);
    const trendMin = this.configService.get<number>('FAKE_STATS_TREND_MIN', -0.08);
    const trendMax = this.configService.get<number>('FAKE_STATS_TREND_MAX', 0.12);
    const noiseStdDev = this.configService.get<number>('FAKE_STATS_NOISE_STDDEV', 0.05);

    // Generate new fake stats using smooth random walk
    const newFakeOnline = this.smoothRandomWalk(
      baseOnline,
      realStats.users_count,
      maxDeltaPercent,
      trendMin,
      trendMax,
      noiseStdDev,
    );

    const newFakeActive = this.smoothRandomWalk(
      baseActive,
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
      basePaid,
      realStats.total_earned,
      maxDeltaPercent,
      paidTrendMin,
      paidTrendMax,
      noiseStdDev * 1.2, // Increased volatility for more noticeable changes
      true, // Only allow growth for paid stats
    );

    // Log paid_usdt calculation details for debugging
    const basePaidNum = Number(basePaid);
    const newFakePaidNum = Number(newFakePaid);
    const paidChangeBeforeRound = newFakePaidNum - basePaidNum;
    const paidChangePercentBeforeRound = basePaidNum > 0 ? (paidChangeBeforeRound / basePaidNum * 100).toFixed(4) : '0.00';
    this.logger.log(`💰 paid_usdt: base=${basePaidNum.toFixed(2)}, newBeforeRound=${newFakePaidNum.toFixed(4)}, change=${paidChangeBeforeRound.toFixed(4)} (${paidChangePercentBeforeRound}%)`);

    const newFakeStats = this.fakeStatsRepo.create({
      online: Math.round(isNaN(newFakeOnline) ? defaultValues.online : newFakeOnline),
      active: Math.round(isNaN(newFakeActive) ? defaultValues.active : newFakeActive),
      paid_usdt: isNaN(newFakePaid) ? defaultValues.paid_usdt : Math.round(newFakePaid * 100) / 100,
    });

    // Log after rounding
    const paidAfterRound = Number(newFakeStats.paid_usdt);
    const paidChangeAfterRound = paidAfterRound - basePaidNum;
    const paidChangePercentAfterRound = basePaidNum > 0 ? (paidChangeAfterRound / basePaidNum * 100).toFixed(4) : '0.00';
    this.logger.log(`💰 paid_usdt after round: ${paidAfterRound.toFixed(2)}, change=${paidChangeAfterRound.toFixed(2)} (${paidChangePercentAfterRound}%)`);

    // Log changes for debugging (using base values for percentage calculation)
    // Ensure all values are numbers (basePaidNum already declared above)
    const previousPaidNum = Number(previousFake.paid_usdt);
    const newPaidNum = Number(newFakeStats.paid_usdt);
    
    const onlineChangePercent = baseOnline > 0 ? ((newFakeStats.online - baseOnline) / baseOnline * 100).toFixed(2) : '0.00';
    const activeChangePercent = baseActive > 0 ? ((newFakeStats.active - baseActive) / baseActive * 100).toFixed(2) : '0.00';
    const paidChangePercent = basePaidNum > 0 ? ((newPaidNum - basePaidNum) / basePaidNum * 100).toFixed(2) : '0.00';
    
    this.logger.log(`📊 Base (used): online=${baseOnline}, active=${baseActive}, paid=${basePaidNum.toFixed(2)}`);
    this.logger.log(`📊 Previous (from DB): online=${previousFake.online}, active=${previousFake.active}, paid=${previousPaidNum.toFixed(2)}`);
    this.logger.log(`📊 New: online=${newFakeStats.online} (${onlineChangePercent}%), active=${newFakeStats.active} (${activeChangePercent}%), paid=${newPaidNum.toFixed(2)} (${paidChangePercent}%)`);

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
    // For fake stats, always use previousValue as base for variation
    // Real value is only used as a reference, not as the base
    const baseValue = previousValue;
    
    // Calculate variation range as percentage of previous value (not real value)
    // This ensures we always get meaningful variations even when real stats are small
    const variationPercent = maxDeltaPercent / 100;
    const targetMin = baseValue * (1 - variationPercent);
    const targetMax = baseValue * (1 + variationPercent);

    // Generate trend (more significant drift)
    const trend = this.randomUniform(trendMin, trendMax);
    
    // Add significant random variation (±5-15% of previous value)
    const randomVariation = previousValue * this.randomUniform(-0.15, 0.15);
    
    // Add more significant noise
    const noise = this.randomGaussian(0, noiseStdDev * previousValue);
    
    // Calculate new value with multiple sources of variation
    let newValue = previousValue + trend * previousValue + randomVariation + noise;

    // Clamp to target range
    newValue = this.clamp(newValue, targetMin, targetMax);

    // ALWAYS ensure minimum change of at least 3-8% to make it VERY noticeable
    const minChange = previousValue * 0.03; // 3% minimum
    const actualChange = Math.abs(newValue - previousValue);
    
    if (actualChange < minChange && !onlyGrowth) {
      // Force a noticeable change (3-8% of previous value)
      const direction = Math.random() > 0.5 ? 1 : -1;
      const forcedChange = previousValue * this.randomUniform(0.03, 0.08);
      newValue = previousValue + direction * forcedChange;
      newValue = this.clamp(newValue, targetMin, targetMax);
    }

    // If only growth, ensure it's not less than previous AND has noticeable change
    if (onlyGrowth) {
      if (newValue < previousValue) {
        // Force growth (3-8% increase) if value decreased
        const growth = previousValue * this.randomUniform(0.03, 0.08);
        newValue = previousValue + growth;
        newValue = this.clamp(newValue, previousValue, targetMax);
      } else {
        // Even if value increased, ensure minimum change for onlyGrowth (3-8%)
        const actualChange = newValue - previousValue;
        const minChangeForGrowth = previousValue * 0.03; // 3% minimum
        if (actualChange < minChangeForGrowth) {
          // Force a noticeable growth (3-8% increase)
          const growth = previousValue * this.randomUniform(0.03, 0.08);
          newValue = previousValue + growth;
          newValue = this.clamp(newValue, previousValue, targetMax);
        }
      }
    }

    // Final check: if change is still too small, force a larger change
    const finalChange = Math.abs(newValue - previousValue);
    if (finalChange < previousValue * 0.02 && !onlyGrowth) {
      const direction = Math.random() > 0.5 ? 1 : -1;
      newValue = previousValue * (1 + direction * this.randomUniform(0.02, 0.06));
      newValue = this.clamp(newValue, targetMin, targetMax);
    }
    
    // For onlyGrowth, final check to ensure noticeable change
    if (onlyGrowth) {
      const finalChangeForGrowth = newValue - previousValue;
      const absoluteMinChange = previousValue * 0.02; // 2% absolute minimum
      if (finalChangeForGrowth < absoluteMinChange) {
        // Force minimum growth
        const forcedValue = previousValue * 1.02; // At least 2% growth
        newValue = this.clamp(forcedValue, previousValue, targetMax);
        // Log if we had to force growth
        if (Math.abs(newValue - forcedValue) > 0.01) {
          // This would indicate targetMax was too restrictive
        }
      }
    }

    // Final safety check: if newValue is NaN or invalid, use safe fallback
    if (!isFinite(newValue) || isNaN(newValue)) {
      // Fallback: simple growth for onlyGrowth, or simple variation otherwise
      if (onlyGrowth) {
        newValue = previousValue * 1.03; // 3% growth as fallback
      } else {
        newValue = previousValue * (1 + this.randomUniform(-0.05, 0.05)); // ±5% variation
      }
      // Ensure it's within bounds
      newValue = this.clamp(newValue, targetMin, targetMax);
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
    // Ensure u1 is not too close to 0 to avoid log(0) = -Infinity
    let u1 = Math.random();
    while (u1 <= 0 || u1 >= 1) {
      u1 = Math.random();
    }
    // Ensure u1 is not too small to avoid numerical issues
    if (u1 < 1e-10) {
      u1 = 1e-10;
    }
    
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const result = mean + z0 * stdDev;
    
    // Validate result is not NaN or Infinity
    if (!isFinite(result)) {
      // Fallback to uniform distribution if Gaussian fails
      return mean + (Math.random() - 0.5) * stdDev * 2;
    }
    
    return result;
  }

  /**
   * Clamp value between min and max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

