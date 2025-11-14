"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PremiumService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PremiumService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const premium_request_entity_1 = require("../../entities/premium-request.entity");
const user_entity_1 = require("../../entities/user.entity");
const ranks_service_1 = require("../ranks/ranks.service");
const user_rank_entity_1 = require("../../entities/user-rank.entity");
const balance_log_entity_1 = require("../../entities/balance-log.entity");
let PremiumService = PremiumService_1 = class PremiumService {
    constructor(premiumRequestRepo, userRepo, balanceLogRepo, ranksService) {
        this.premiumRequestRepo = premiumRequestRepo;
        this.userRepo = userRepo;
        this.balanceLogRepo = balanceLogRepo;
        this.ranksService = ranksService;
        this.logger = new common_1.Logger(PremiumService_1.name);
    }
    async createRequest(userId, paymentMethod) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const rank = await this.ranksService.getUserRank(userId);
        if (rank.current_rank !== user_rank_entity_1.RankLevel.GOLD && rank.current_rank !== user_rank_entity_1.RankLevel.PLATINUM) {
            throw new common_1.BadRequestException('Платиновая подписка доступна только с уровня Золото');
        }
        const settings = await this.ranksService.getSettings();
        let amount;
        let currency;
        let prefix;
        switch (paymentMethod) {
            case premium_request_entity_1.PaymentMethod.USD_BALANCE:
                amount = settings.platinum_price_usd;
                currency = 'USD';
                prefix = 'USD';
                break;
            case premium_request_entity_1.PaymentMethod.RUB_REQUISITES:
                amount = settings.platinum_price_rub;
                currency = 'RUB';
                prefix = 'RUB';
                break;
            case premium_request_entity_1.PaymentMethod.UAH_REQUISITES:
                amount = settings.platinum_price_uah;
                currency = 'UAH';
                prefix = 'UAH';
                break;
            default:
                throw new common_1.BadRequestException('Invalid payment method');
        }
        const timestamp = Date.now().toString().slice(-5);
        const requestNumber = `${prefix}-${timestamp}`;
        const request = this.premiumRequestRepo.create({
            request_number: requestNumber,
            user_id: userId,
            payment_method: paymentMethod,
            amount,
            currency,
            status: premium_request_entity_1.RequestStatus.NEW,
        });
        await this.premiumRequestRepo.save(request);
        this.logger.log(`Created premium request ${requestNumber} for user ${userId}`);
        return request;
    }
    async processBalancePayment(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
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
        const request = await this.createRequest(userId, premium_request_entity_1.PaymentMethod.USD_BALANCE);
        const balanceBefore = currentBalance;
        const balanceAfter = currentBalance - amount;
        user.balance_usdt = balanceAfter;
        await this.userRepo.save(user);
        await this.balanceLogRepo.save({
            user_id: userId,
            delta: -amount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            reason: 'platinum_subscription',
            comment: `Оплата Платиновой подписки (запрос ${request.request_number})`,
        });
        request.status = premium_request_entity_1.RequestStatus.COMPLETED;
        request.completed_at = new Date();
        await this.premiumRequestRepo.save(request);
        await this.ranksService.activatePlatinum(userId, settings.platinum_duration_days);
        this.logger.log(`Processed balance payment for user ${userId}, activated platinum`);
        return {
            success: true,
            message: '✅ Оплата прошла успешно! Твоя Платиновая подписка активирована на 30 дней',
            request,
        };
    }
    async getAllRequests(status, currency) {
        const where = {};
        if (status)
            where.status = status;
        if (currency)
            where.currency = currency;
        return await this.premiumRequestRepo.find({
            where,
            relations: ['user'],
            order: { created_at: 'DESC' },
        });
    }
    async markRequisitesSent(requestId, adminTgId) {
        const request = await this.premiumRequestRepo.findOne({ where: { id: requestId } });
        if (!request) {
            throw new common_1.NotFoundException('Request not found');
        }
        request.status = premium_request_entity_1.RequestStatus.REQUISITES_SENT;
        request.requisites_sent_at = new Date();
        request.processed_by_admin = adminTgId;
        return await this.premiumRequestRepo.save(request);
    }
    async confirmPayment(requestId, adminTgId) {
        const request = await this.premiumRequestRepo.findOne({ where: { id: requestId } });
        if (!request) {
            throw new common_1.NotFoundException('Request not found');
        }
        request.status = premium_request_entity_1.RequestStatus.PAYMENT_CONFIRMED;
        request.payment_confirmed_at = new Date();
        request.processed_by_admin = adminTgId;
        return await this.premiumRequestRepo.save(request);
    }
    async activateSubscription(requestId, adminTgId) {
        const request = await this.premiumRequestRepo.findOne({ where: { id: requestId }, relations: ['user'] });
        if (!request) {
            throw new common_1.NotFoundException('Request not found');
        }
        if (request.status === premium_request_entity_1.RequestStatus.COMPLETED) {
            throw new common_1.BadRequestException('Subscription already activated');
        }
        const settings = await this.ranksService.getSettings();
        await this.ranksService.activatePlatinum(request.user_id, settings.platinum_duration_days);
        request.status = premium_request_entity_1.RequestStatus.COMPLETED;
        request.completed_at = new Date();
        request.processed_by_admin = adminTgId;
        await this.premiumRequestRepo.save(request);
        this.logger.log(`Activated platinum subscription for request ${request.request_number}`);
        return {
            request,
            message: `Подписка активирована для пользователя ${request.user.username || request.user.tg_id}`,
        };
    }
    async cancelRequest(requestId, reason) {
        const request = await this.premiumRequestRepo.findOne({ where: { id: requestId } });
        if (!request) {
            throw new common_1.NotFoundException('Request not found');
        }
        request.status = premium_request_entity_1.RequestStatus.CANCELLED;
        if (reason) {
            request.admin_notes = reason;
        }
        return await this.premiumRequestRepo.save(request);
    }
};
exports.PremiumService = PremiumService;
exports.PremiumService = PremiumService = PremiumService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(premium_request_entity_1.PremiumRequest)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(balance_log_entity_1.BalanceLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        ranks_service_1.RanksService])
], PremiumService);
//# sourceMappingURL=premium.service.js.map