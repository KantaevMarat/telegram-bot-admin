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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const balance_log_entity_1 = require("../../entities/balance-log.entity");
const user_entity_1 = require("../../entities/user.entity");
let BalanceService = class BalanceService {
    constructor(balanceLogRepo, userRepo) {
        this.balanceLogRepo = balanceLogRepo;
        this.userRepo = userRepo;
    }
    async getBalanceOverview() {
        const totalBalance = await this.userRepo
            .createQueryBuilder('user')
            .select('COALESCE(SUM(user.balance_usdt), 0)', 'total')
            .getRawOne();
        const totalEarned = await this.userRepo
            .createQueryBuilder('user')
            .select('COALESCE(SUM(user.total_earned), 0)', 'total')
            .getRawOne();
        const topUsers = await this.userRepo.find({
            order: { balance_usdt: 'DESC' },
            take: 10,
            select: ['id', 'tg_id', 'username', 'first_name', 'balance_usdt'],
        });
        return {
            total_balance: parseFloat(totalBalance?.total || '0'),
            total_earned: parseFloat(totalEarned?.total || '0'),
            top_users: topUsers,
        };
    }
    async getBalanceLogs(page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const [logs, total] = await this.balanceLogRepo.findAndCount({
            relations: ['user'],
            order: { created_at: 'DESC' },
            skip,
            take: limit,
        });
        return {
            data: logs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
};
exports.BalanceService = BalanceService;
exports.BalanceService = BalanceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(balance_log_entity_1.BalanceLog)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], BalanceService);
//# sourceMappingURL=balance.service.js.map