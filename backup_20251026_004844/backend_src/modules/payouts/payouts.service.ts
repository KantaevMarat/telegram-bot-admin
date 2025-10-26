import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payout } from '../../entities/payout.entity';
import { UsersService } from '../users/users.service';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { DeclinePayoutDto } from './dto/decline-payout.dto';

@Injectable()
export class PayoutsService {
  constructor(
    @InjectRepository(Payout)
    private payoutRepo: Repository<Payout>,
    private usersService: UsersService,
  ) {}

  async create(userId: string, createPayoutDto: CreatePayoutDto) {
    const user = await this.usersService.findOne(userId);

    if (user.balance_usdt < createPayoutDto.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const payout = this.payoutRepo.create({
      user_id: userId,
      amount: createPayoutDto.amount,
      method: createPayoutDto.method,
      method_details: createPayoutDto.method_details,
      status: 'pending',
    });

    return await this.payoutRepo.save(payout);
  }

  async findAll(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const queryBuilder = this.payoutRepo
      .createQueryBuilder('payout')
      .leftJoinAndSelect('payout.user', 'user');

    if (status) {
      queryBuilder.where('payout.status = :status', { status });
    }

    const [payouts, total] = await queryBuilder
      .orderBy('payout.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: payouts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const payout = await this.payoutRepo.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    return payout;
  }

  async approve(id: string, adminTgId: string) {
    const payout = await this.findOne(id);

    if (payout.status !== 'pending') {
      throw new BadRequestException('Payout is not pending');
    }

    // Find user by user_id and get their tg_id
    const user = await this.usersService.findById(payout.user_id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Deduct balance from user using tg_id
    await this.usersService.updateBalance(
      user.tg_id.toString(),
      -payout.amount,
      'payout',
      adminTgId,
      `Payout approved: ${payout.id}`,
    );

    payout.status = 'approved';
    payout.processed_by_admin_tg_id = adminTgId;

    return await this.payoutRepo.save(payout);
  }

  async decline(id: string, adminTgId: string, declineDto: DeclinePayoutDto) {
    const payout = await this.findOne(id);

    if (payout.status !== 'pending') {
      throw new BadRequestException('Payout is not pending');
    }

    payout.status = 'declined';
    payout.reason_if_declined = declineDto.reason;
    payout.processed_by_admin_tg_id = adminTgId;

    return await this.payoutRepo.save(payout);
  }
}

