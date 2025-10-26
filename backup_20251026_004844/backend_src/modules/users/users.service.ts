import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User } from '../../entities/user.entity';
import { BalanceLog } from '../../entities/balance-log.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(BalanceLog)
    private balanceLogRepo: Repository<BalanceLog>,
  ) {}

  async findAll(page = 1, limit = 20, search?: string, status?: string) {
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepo.createQueryBuilder('user');

    if (search) {
      queryBuilder.where(
        '(user.username ILIKE :search OR user.first_name ILIKE :search OR user.tg_id::text ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
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
      throw new Error('Insufficient balance');
    }

    user.balance_usdt = balanceAfter;
    await this.userRepo.save(user);

    // Log balance change
    await this.balanceLogRepo.save({
      user_id: user.id,
      admin_tg_id: adminTgId,
      delta,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reason,
      comment,
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
}

