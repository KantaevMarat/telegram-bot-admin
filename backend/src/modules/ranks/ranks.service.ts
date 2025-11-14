import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { UserRank, RankLevel } from '../../entities/user-rank.entity';
import { RankSettings } from '../../entities/rank-settings.entity';
import { User } from '../../entities/user.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class RanksService {
  private readonly logger = new Logger(RanksService.name);

  constructor(
    @InjectRepository(UserRank)
    private rankRepo: Repository<UserRank>,
    @InjectRepository(RankSettings)
    private settingsRepo: Repository<RankSettings>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // Получить или создать ранг пользователя
  async getUserRank(userId: string): Promise<UserRank> {
    let rank = await this.rankRepo.findOne({ where: { user_id: userId } });
    
    if (!rank) {
      rank = this.rankRepo.create({
        user_id: userId,
        current_rank: RankLevel.STONE,
        bonus_percentage: 0,
      });
      await this.rankRepo.save(rank);
      this.logger.log(`Created new rank for user ${userId}: STONE`);
    }
    
    return rank;
  }

  // Проверить и обновить ранг пользователя
  async checkAndUpdateRank(userId: string): Promise<{ rank: UserRank; leveledUp: boolean; newLevel?: RankLevel }> {
    const rank = await this.getUserRank(userId);
    const oldRank = rank.current_rank;
    const settings = await this.getSettings();
    
    // Проверка перехода на Бронзу
    if (rank.current_rank === RankLevel.STONE && rank.channels_subscribed) {
      rank.current_rank = RankLevel.BRONZE;
      rank.bonus_percentage = settings.bronze_bonus;
      await this.rankRepo.save(rank);
      this.logger.log(`User ${userId} promoted to BRONZE`);
      return { rank, leveledUp: true, newLevel: RankLevel.BRONZE };
    }
    
    // Проверка перехода на Серебро
    if (rank.current_rank === RankLevel.BRONZE && 
        rank.tasks_completed >= settings.silver_required_tasks &&
        rank.referrals_count >= settings.silver_required_referrals) {
      rank.current_rank = RankLevel.SILVER;
      rank.bonus_percentage = settings.silver_bonus;
      await this.rankRepo.save(rank);
      this.logger.log(`User ${userId} promoted to SILVER`);
      return { rank, leveledUp: true, newLevel: RankLevel.SILVER };
    }
    
    // Проверка перехода на Золото
    if (rank.current_rank === RankLevel.SILVER &&
        rank.tasks_completed >= settings.gold_required_tasks &&
        rank.referrals_count >= settings.gold_required_referrals) {
      rank.current_rank = RankLevel.GOLD;
      rank.bonus_percentage = settings.gold_bonus;
      rank.notified_gold_achieved = false; // Сбросить флаг для уведомления
      await this.rankRepo.save(rank);
      this.logger.log(`User ${userId} promoted to GOLD`);
      return { rank, leveledUp: true, newLevel: RankLevel.GOLD };
    }
    
    // Проверка активности платиновой подписки
    if (rank.platinum_active && rank.platinum_expires_at) {
      const now = new Date();
      if (now > rank.platinum_expires_at) {
        rank.platinum_active = false;
        rank.current_rank = RankLevel.GOLD; // Возврат к Золоту
        rank.bonus_percentage = settings.gold_bonus;
        await this.rankRepo.save(rank);
        this.logger.log(`User ${userId} platinum subscription expired, returned to GOLD`);
      }
    }
    
    return { rank, leveledUp: false };
  }

  // Применить бонус к награде
  applyRankBonus(baseReward: number, bonusPercentage: number): number {
    return parseFloat((baseReward * (1 + bonusPercentage / 100)).toFixed(2));
  }

  // Увеличить счетчик выполненных заданий
  async incrementTasksCompleted(userId: string): Promise<void> {
    const rank = await this.getUserRank(userId);
    rank.tasks_completed++;
    await this.rankRepo.save(rank);
    
    // Проверить возможность повышения
    await this.checkAndUpdateRank(userId);
  }

  // Увеличить счетчик рефералов
  async incrementReferralsCount(userId: string): Promise<void> {
    const rank = await this.getUserRank(userId);
    rank.referrals_count++;
    await this.rankRepo.save(rank);
    
    // Проверить возможность повышения
    await this.checkAndUpdateRank(userId);
  }

  // Установить статус подписки на каналы
  async setChannelsSubscribed(userId: string, subscribed: boolean): Promise<void> {
    const rank = await this.getUserRank(userId);
    rank.channels_subscribed = subscribed;
    await this.rankRepo.save(rank);
    
    // Проверить возможность повышения
    await this.checkAndUpdateRank(userId);
  }

  // Активировать платиновую подписку
  async activatePlatinum(userId: string, durationDays: number): Promise<UserRank> {
    const rank = await this.getUserRank(userId);
    const settings = await this.getSettings();
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);
    
    rank.current_rank = RankLevel.PLATINUM;
    rank.platinum_active = true;
    rank.platinum_expires_at = expiresAt;
    rank.bonus_percentage = settings.platinum_bonus;
    
    await this.rankRepo.save(rank);
    this.logger.log(`Activated platinum subscription for user ${userId} until ${expiresAt}`);
    
    return rank;
  }

  // Получить настройки
  async getSettings(): Promise<RankSettings> {
    const settings = await this.settingsRepo.findOne({ where: {} });
    if (!settings) {
      // Создать дефолтные если нет
      return await this.settingsRepo.save(this.settingsRepo.create({}));
    }
    return settings;
  }

  // Обновить настройки
  async updateSettings(data: Partial<RankSettings>): Promise<RankSettings> {
    let settings = await this.getSettings();
    Object.assign(settings, data);
    return await this.settingsRepo.save(settings);
  }

  // Получить прогресс до следующего ранга
  async getRankProgress(userId: string): Promise<{
    currentRank: RankLevel;
    nextRank: RankLevel | null;
    progress: number;
    tasksProgress: { current: number; required: number };
    referralsProgress: { current: number; required: number };
  }> {
    const rank = await this.getUserRank(userId);
    const settings = await this.getSettings();
    
    let nextRank: RankLevel | null = null;
    let tasksRequired = 0;
    let referralsRequired = 0;
    
    switch (rank.current_rank) {
      case RankLevel.STONE:
        nextRank = RankLevel.BRONZE;
        tasksRequired = 0;
        referralsRequired = 0;
        break;
      case RankLevel.BRONZE:
        nextRank = RankLevel.SILVER;
        tasksRequired = settings.silver_required_tasks;
        referralsRequired = settings.silver_required_referrals;
        break;
      case RankLevel.SILVER:
        nextRank = RankLevel.GOLD;
        tasksRequired = settings.gold_required_tasks;
        referralsRequired = settings.gold_required_referrals;
        break;
      case RankLevel.GOLD:
        nextRank = RankLevel.PLATINUM;
        tasksRequired = settings.gold_required_tasks;
        referralsRequired = settings.gold_required_referrals;
        break;
      case RankLevel.PLATINUM:
        nextRank = null;
        break;
    }
    
    const tasksProgress = Math.min(100, (rank.tasks_completed / tasksRequired) * 100);
    const referralsProgress = Math.min(100, (rank.referrals_count / referralsRequired) * 100);
    const overallProgress = (tasksProgress + referralsProgress) / 2;
    
    return {
      currentRank: rank.current_rank,
      nextRank,
      progress: overallProgress,
      tasksProgress: { current: rank.tasks_completed, required: tasksRequired },
      referralsProgress: { current: rank.referrals_count, required: referralsRequired },
    };
  }

  // Cron job: проверка истечения подписок (каждый день в 10:00)
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async checkExpiringSubscriptions() {
    this.logger.log('Checking expiring platinum subscriptions...');
    
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const expiringRanks = await this.rankRepo.find({
      where: {
        platinum_active: true,
        platinum_expires_at: MoreThan(new Date()),
      },
      relations: ['user'],
    });
    
    for (const rank of expiringRanks) {
      if (rank.platinum_expires_at && rank.platinum_expires_at <= threeDaysFromNow) {
        // TODO: Отправить уведомление пользователю
        this.logger.log(`User ${rank.user_id} platinum subscription expires soon`);
      }
    }
  }

  // Получить статистику по рангам
  async getRankStatistics() {
    const stats = await this.rankRepo
      .createQueryBuilder('rank')
      .select('rank.current_rank', 'rank')
      .addSelect('COUNT(*)', 'count')
      .groupBy('rank.current_rank')
      .getRawMany();
    
    const platinumActive = await this.rankRepo.count({ where: { platinum_active: true } });
    
    return {
      byRank: stats,
      platinumActive,
      total: await this.rankRepo.count(),
    };
  }
}

