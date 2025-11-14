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
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../../entities/user.entity");
const balance_log_entity_1 = require("../../entities/balance-log.entity");
const payout_entity_1 = require("../../entities/payout.entity");
const bot_service_1 = require("../bot/bot.service");
const fake_stats_service_1 = require("../stats/fake-stats.service");
let UsersService = UsersService_1 = class UsersService {
    constructor(userRepo, balanceLogRepo, payoutRepo, botService, fakeStatsService) {
        this.userRepo = userRepo;
        this.balanceLogRepo = balanceLogRepo;
        this.payoutRepo = payoutRepo;
        this.botService = botService;
        this.fakeStatsService = fakeStatsService;
        this.logger = new common_1.Logger(UsersService_1.name);
    }
    async findAll(page = 1, limit = 20, search, status) {
        const skip = (page - 1) * limit;
        const queryBuilder = this.userRepo.createQueryBuilder('user');
        if (search) {
            queryBuilder.where('(user.username ILIKE :search OR user.first_name ILIKE :search OR user.last_name ILIKE :search OR user.tg_id::text ILIKE :search)', { search: `%${search}%` });
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
    async findOne(id) {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async findByTgId(tg_id) {
        return await this.userRepo.findOne({ where: { tg_id } });
    }
    async findById(id) {
        return await this.userRepo.findOne({ where: { id } });
    }
    async updateBalance(tgId, delta, reason, adminTgId, comment) {
        const user = await this.findByTgId(tgId);
        if (!user) {
            throw new common_1.NotFoundException(`User with tg_id ${tgId} not found`);
        }
        const balanceBefore = parseFloat(user.balance_usdt.toString());
        const balanceAfter = balanceBefore + delta;
        if (balanceAfter < 0) {
            throw new common_1.BadRequestException('Insufficient balance');
        }
        user.balance_usdt = balanceAfter;
        await this.userRepo.save(user);
        const balanceLog = await this.balanceLogRepo.save({
            user_id: user.id,
            admin_tg_id: adminTgId,
            delta,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            reason,
            comment,
        });
        this.logger.log(`Balance updated: user=${tgId}, delta=${delta}, reason=${reason}, ` +
            `balance: ${balanceBefore} → ${balanceAfter}`);
        this.botService
            .sendBalanceChangeNotification(tgId, balanceBefore, balanceAfter, delta, reason, comment)
            .then(() => {
            this.logger.log(`✅ Balance notification sent to user ${tgId}`);
        })
            .catch((error) => {
            this.logger.error(`❌ Failed to send balance notification to user ${tgId}:`, error.message);
        });
        this.fakeStatsService
            .regenerateFakeStats()
            .then(() => {
            this.logger.log('✅ Fake stats updated after balance change');
        })
            .catch((error) => {
            this.logger.error('❌ Failed to update fake stats:', error.message);
        });
        return user;
    }
    async blockUser(id) {
        const user = await this.findOne(id);
        user.status = 'blocked';
        return await this.userRepo.save(user);
    }
    async unblockUser(id) {
        const user = await this.findOne(id);
        user.status = 'active';
        return await this.userRepo.save(user);
    }
    async getBalanceLogs(userId, limit = 50) {
        return await this.balanceLogRepo.find({
            where: { user_id: userId },
            order: { created_at: 'DESC' },
            take: limit,
        });
    }
    async createPayoutRequest(user, amount, walletAddress) {
        const balanceBefore = parseFloat(user.balance_usdt.toString());
        const balanceAfter = balanceBefore - amount;
        user.balance_usdt = balanceAfter;
        await this.userRepo.save(user);
        const payout = this.payoutRepo.create({
            user_id: user.id,
            amount: amount,
            method: 'crypto',
            method_details: `TRC20: ${walletAddress}`,
            status: 'pending',
        });
        await this.payoutRepo.save(payout);
        const comment = `Заявка на вывод на кошелёк ${walletAddress}`;
        await this.balanceLogRepo.save({
            user_id: user.id,
            delta: -amount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            reason: 'payout_request',
            comment,
        });
        this.logger.log(`Payout request created: user=${user.tg_id}, amount=${amount}, wallet=${walletAddress}`);
        this.botService
            .sendBalanceChangeNotification(user.tg_id, balanceBefore, balanceAfter, -amount, 'payout_request', comment)
            .then(() => {
            this.logger.log(`✅ Payout notification sent to user ${user.tg_id}`);
        })
            .catch((error) => {
            this.logger.error(`❌ Failed to send payout notification to user ${user.tg_id}:`, error.message);
        });
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
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(balance_log_entity_1.BalanceLog)),
    __param(2, (0, typeorm_1.InjectRepository)(payout_entity_1.Payout)),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => bot_service_1.BotService))),
    __param(4, (0, common_1.Inject)((0, common_1.forwardRef)(() => fake_stats_service_1.FakeStatsService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        bot_service_1.BotService,
        fake_stats_service_1.FakeStatsService])
], UsersService);
//# sourceMappingURL=users.service.js.map