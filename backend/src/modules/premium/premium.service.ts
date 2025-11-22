import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PremiumRequest, PaymentMethod, RequestStatus } from '../../entities/premium-request.entity';
import { User } from '../../entities/user.entity';
import { RanksService } from '../ranks/ranks.service';
import { RankLevel } from '../../entities/user-rank.entity';
import { BalanceLog } from '../../entities/balance-log.entity';

@Injectable()
export class PremiumService {
  private readonly logger = new Logger(PremiumService.name);

  constructor(
    @InjectRepository(PremiumRequest)
    private premiumRequestRepo: Repository<PremiumRequest>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(BalanceLog)
    private balanceLogRepo: Repository<BalanceLog>,
    private ranksService: RanksService,
  ) {}

  // Создать запрос на подписку
  async createRequest(
    userId: string,
    paymentMethod: PaymentMethod,
  ): Promise<PremiumRequest> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const rank = await this.ranksService.getUserRank(userId);
    
    // Проверка: доступна только с уровня Золото
    if (rank.current_rank !== RankLevel.GOLD && rank.current_rank !== RankLevel.PLATINUM) {
      throw new BadRequestException('Платиновая подписка доступна только с уровня Золото');
    }

    const settings = await this.ranksService.getSettings();
    
    let amount: number;
    let currency: string;
    let prefix: string;
    
    switch (paymentMethod) {
      case PaymentMethod.USD_BALANCE:
        amount = settings.platinum_price_usd;
        currency = 'USD';
        prefix = 'USD';
        break;
      case PaymentMethod.RUB_REQUISITES:
        amount = settings.platinum_price_rub;
        currency = 'RUB';
        prefix = 'RUB';
        break;
      case PaymentMethod.UAH_REQUISITES:
        amount = settings.platinum_price_uah;
        currency = 'UAH';
        prefix = 'UAH';
        break;
      default:
        throw new BadRequestException('Invalid payment method');
    }

    // Генерация уникального номера запроса
    const timestamp = Date.now().toString().slice(-5);
    const requestNumber = `${prefix}-${timestamp}`;

    const request = this.premiumRequestRepo.create({
      request_number: requestNumber,
      user_id: userId,
      payment_method: paymentMethod,
      amount,
      currency,
      status: RequestStatus.NEW,
    });

    await this.premiumRequestRepo.save(request);
    this.logger.log(`Created premium request ${requestNumber} for user ${userId}`);

    return request;
  }

  // Оплата с баланса (автоматическая)
  async processBalancePayment(userId: string): Promise<{ success: boolean; message: string; request?: PremiumRequest }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const settings = await this.ranksService.getSettings();
    const amount = settings.platinum_price_usd;
    const currentBalance = parseFloat(user.balance_usdt.toString());

    if (currentBalance < amount) {
      return {
        success: false,
        message: `Недостаточно средств на балансе. Требуется ${amount}$, доступно ${currentBalance.toFixed(2)}$`,
      };
    }

    // Создать запрос
    const request = await this.createRequest(userId, PaymentMethod.USD_BALANCE);

    // Списать средства
    const balanceBefore = currentBalance;
    const balanceAfter = currentBalance - amount;
    
    user.balance_usdt = balanceAfter;
    await this.userRepo.save(user);

    // Логирование
    await this.balanceLogRepo.save({
      user_id: userId,
      delta: -amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reason: 'platinum_subscription',
      comment: `Оплата Платиновой подписки (запрос ${request.request_number})`,
    });

    // Обновить статус запроса
    request.status = RequestStatus.COMPLETED;
    request.completed_at = new Date();
    await this.premiumRequestRepo.save(request);

    // Активировать подписку
    await this.ranksService.activatePlatinum(userId, settings.platinum_duration_days);

    this.logger.log(`Processed balance payment for user ${userId}, activated platinum`);

    return {
      success: true,
      message: '✅ Оплата прошла успешно! Твоя Платиновая подписка активирована на 30 дней',
      request,
    };
  }

  // Получить все запросы (для админки)
  async getAllRequests(status?: RequestStatus, currency?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (currency) where.currency = currency;

    return await this.premiumRequestRepo.find({
      where,
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  // Отметить что реквизиты отправлены
  async markRequisitesSent(requestId: string, adminTgId: string): Promise<PremiumRequest> {
    const request = await this.premiumRequestRepo.findOne({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    request.status = RequestStatus.REQUISITES_SENT;
    request.requisites_sent_at = new Date();
    request.processed_by_admin = adminTgId;

    return await this.premiumRequestRepo.save(request);
  }

  // Подтвердить оплату
  async confirmPayment(requestId: string, adminTgId: string): Promise<PremiumRequest> {
    const request = await this.premiumRequestRepo.findOne({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    request.status = RequestStatus.PAYMENT_CONFIRMED;
    request.payment_confirmed_at = new Date();
    request.processed_by_admin = adminTgId;

    return await this.premiumRequestRepo.save(request);
  }

  // Активировать подписку после оплаты
  async activateSubscription(requestId: string, adminTgId: string): Promise<{ request: PremiumRequest; message: string }> {
    const request = await this.premiumRequestRepo.findOne({ where: { id: requestId }, relations: ['user'] });
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status === RequestStatus.COMPLETED) {
      throw new BadRequestException('Subscription already activated');
    }

    const settings = await this.ranksService.getSettings();

    // Активировать подписку
    await this.ranksService.activatePlatinum(request.user_id, settings.platinum_duration_days);

    // Обновить статус запроса
    request.status = RequestStatus.COMPLETED;
    request.completed_at = new Date();
    request.processed_by_admin = adminTgId;
    await this.premiumRequestRepo.save(request);

    this.logger.log(`Activated platinum subscription for request ${request.request_number}`);

    return {
      request,
      message: `Подписка активирована для пользователя ${request.user.username || request.user.tg_id}`,
    };
  }

  // Отменить запрос
  async cancelRequest(requestId: string, reason?: string): Promise<PremiumRequest> {
    const request = await this.premiumRequestRepo.findOne({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    request.status = RequestStatus.CANCELLED;
    if (reason) {
      request.admin_notes = reason;
    }

    return await this.premiumRequestRepo.save(request);
  }
}

