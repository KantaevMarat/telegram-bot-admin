import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User } from '../../entities/user.entity';
import { BalanceLog } from '../../entities/balance-log.entity';
import { Payout } from '../../entities/payout.entity';
import { BotService } from '../bot/bot.service';
import { FakeStatsService } from '../stats/fake-stats.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(BalanceLog)
    private balanceLogRepo: Repository<BalanceLog>,
    @InjectRepository(Payout)
    private payoutRepo: Repository<Payout>,
    @Inject(forwardRef(() => BotService))
    private botService: BotService,
    @Inject(forwardRef(() => FakeStatsService))
    private fakeStatsService: FakeStatsService,
  ) {}

  async findAll(page = 1, limit = 20, search?: string, status?: string) {
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepo.createQueryBuilder('user');

    // Проверяем что search не пустая строка
    const hasSearch = search && search.trim().length > 0;
    const hasStatus = status && status !== 'all';

    // Если есть поиск, добавляем условие поиска
    if (hasSearch) {
      queryBuilder.where(
        '(user.username ILIKE :search OR user.first_name ILIKE :search OR user.last_name ILIKE :search OR user.tg_id::text ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }

    // Если есть фильтр по статусу, добавляем его (andWhere если уже есть where, иначе where)
    if (hasStatus) {
      if (hasSearch) {
        queryBuilder.andWhere('user.status = :status', { status });
      } else {
        queryBuilder.where('user.status = :status', { status });
      }
    }

    const [users, total] = await queryBuilder
      .orderBy('user.registered_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByTgId(tg_id: string) {
    return await this.userRepo.findOne({ where: { tg_id } });
  }

  async findById(id: string) {
    return await this.userRepo.findOne({ where: { id } });
  }

  async updateBalance(
    tgId: string,
    delta: number,
    reason: string,
    adminTgId?: string,
    comment?: string,
  ) {
    const user = await this.findByTgId(tgId);
    if (!user) {
      throw new NotFoundException(`User with tg_id ${tgId} not found`);
    }

    const balanceBefore = parseFloat(user.balance_usdt.toString());
    const balanceAfter = balanceBefore + delta;

    if (balanceAfter < 0) {
      throw new BadRequestException('Insufficient balance');
    }

    user.balance_usdt = balanceAfter;
    await this.userRepo.save(user);

    // Log balance change
    const balanceLog = await this.balanceLogRepo.save({
      user_id: user.id,
      admin_tg_id: adminTgId,
      delta,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reason,
      comment,
    });

    this.logger.log(
      `Balance updated: user=${tgId}, delta=${delta}, reason=${reason}, ` +
      `balance: ${balanceBefore} → ${balanceAfter}`
    );

    // 📱 Send notification to user in Telegram (async, non-blocking)
    // We don't await this to prevent blocking the response
    this.botService
      .sendBalanceChangeNotification(
        tgId,
        balanceBefore,
        balanceAfter,
        delta,
        reason,
        comment,
      )
      .then(() => {
        this.logger.log(`✅ Balance notification sent to user ${tgId}`);
      })
      .catch((error) => {
        this.logger.error(`❌ Failed to send balance notification to user ${tgId}:`, error.message);
        // Notification failure should not break the transaction
      });

    // 📊 Update fake stats (async, non-blocking)
    // Trigger regeneration of fake stats to reflect the balance change
    this.fakeStatsService
      .regenerateFakeStats()
      .then(() => {
        this.logger.log('✅ Fake stats updated after balance change');
      })
      .catch((error) => {
        this.logger.error('❌ Failed to update fake stats:', error.message);
        // Fake stats update failure should not break the transaction
      });

    return user;
  }

  async blockUser(id: string) {
    const user = await this.findOne(id);
    user.status = 'blocked';
    return await this.userRepo.save(user);
  }

  async unblockUser(id: string) {
    const user = await this.findOne(id);
    user.status = 'active';
    return await this.userRepo.save(user);
  }

  async getBalanceLogs(userId: string, limit = 50) {
    return await this.balanceLogRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async createPayoutRequest(user: User, amount: number, walletAddress: string) {
    // Deduct balance immediately
    const balanceBefore = parseFloat(user.balance_usdt.toString());
    const balanceAfter = balanceBefore - amount;
    user.balance_usdt = balanceAfter;
    await this.userRepo.save(user);

    // Create payout request
    const payout = this.payoutRepo.create({
      user_id: user.id,
      amount: amount,
      method: 'crypto',
      method_details: `TRC20: ${walletAddress}`,
      status: 'pending',
    });

    await this.payoutRepo.save(payout);

    const comment = `Заявка на вывод на кошелёк ${walletAddress}`;

    // Log balance change
    await this.balanceLogRepo.save({
      user_id: user.id,
      delta: -amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reason: 'payout_request',
      comment,
    });

    this.logger.log(
      `Payout request created: user=${user.tg_id}, amount=${amount}, wallet=${walletAddress}`
    );

    // 📱 Send notification to user in Telegram (async, non-blocking)
    this.botService
      .sendBalanceChangeNotification(
        user.tg_id,
        balanceBefore,
        balanceAfter,
        -amount,
        'payout_request',
        comment,
      )
      .then(() => {
        this.logger.log(`✅ Payout notification sent to user ${user.tg_id}`);
      })
      .catch((error) => {
        this.logger.error(`❌ Failed to send payout notification to user ${user.tg_id}:`, error.message);
      });

    // 📊 Update fake stats (async, non-blocking)
    this.fakeStatsService
      .regenerateFakeStats()
      .then(() => {
        this.logger.log('✅ Fake stats updated after payout request');
      })
      .catch((error) => {
        this.logger.error('❌ Failed to update fake stats:', error.message);
      });

    return payout;
  }
}
