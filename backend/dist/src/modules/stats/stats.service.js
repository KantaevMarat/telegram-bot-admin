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
exports.StatsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fake_stats_service_1 = require("./fake-stats.service");
const real_stats_snapshot_entity_1 = require("../../entities/real-stats-snapshot.entity");
const user_entity_1 = require("../../entities/user.entity");
const payout_entity_1 = require("../../entities/payout.entity");
let StatsService = class StatsService {
    constructor(realStatsRepo, userRepo, payoutRepo, fakeStatsService) {
        this.realStatsRepo = realStatsRepo;
        this.userRepo = userRepo;
        this.payoutRepo = payoutRepo;
        this.fakeStatsService = fakeStatsService;
    }
    async getCombinedStats() {
        const realStats = await this.getRealStats();
        const fakeStats = await this.fakeStatsService.getLatestFakeStats();
        return {
            real: realStats,
            fake: {
                online: fakeStats.online,
                active: fakeStats.active,
                paid_usdt: fakeStats.paid_usdt,
                calculated_at: fakeStats.calculated_at,
            },
        };
    }
    async getRealStats() {
        const usersCount = await this.userRepo.count();
        const totalBalanceResult = await this.userRepo
            .createQueryBuilder('user')
            .select('COALESCE(SUM(user.balance_usdt), 0)', 'total')
            .getRawOne();
        const totalEarnedResult = await this.userRepo
            .createQueryBuilder('user')
            .select('COALESCE(SUM(user.total_earned), 0)', 'total')
            .getRawOne();
        const activeUsers24h = await this.userRepo
            .createQueryBuilder('user')
            .where('user.updated_at > NOW() - INTERVAL \'24 hours\'')
            .getCount();
        const totalPayouts = await this.payoutRepo
            .createQueryBuilder('payout')
            .where('payout.status = :status', { status: 'approved' })
            .select('COALESCE(SUM(payout.amount), 0)', 'total')
            .getRawOne();
        const pendingPayouts = await this.payoutRepo.count({
            where: { status: 'pending' },
        });
        return {
            users_count: usersCount,
            total_balance: parseFloat(totalBalanceResult?.total || '0'),
            total_earned: parseFloat(totalEarnedResult?.total || '0'),
            active_users_24h: activeUsers24h,
            total_payouts: parseFloat(totalPayouts?.total || '0'),
            pending_payouts: pendingPayouts,
        };
    }
    async getStatsHistory(days = 30) {
        const realHistory = await this.realStatsRepo.find({
            where: {},
            order: { taken_at: 'DESC' },
            take: days * 6,
        });
        const fakeHistory = await this.fakeStatsService.getFakeStatsHistory(days * 6);
        return {
            real: realHistory.reverse(),
            fake: fakeHistory.reverse(),
        };
    }
    async getTopUsers(limit = 10) {
        const topByBalance = await this.userRepo.find({
            order: { balance_usdt: 'DESC' },
            take: limit,
            select: ['id', 'tg_id', 'username', 'first_name', 'balance_usdt'],
        });
        const topByEarned = await this.userRepo.find({
            order: { total_earned: 'DESC' },
            take: limit,
            select: ['id', 'tg_id', 'username', 'first_name', 'total_earned'],
        });
        const topByTasks = await this.userRepo.find({
            order: { tasks_completed: 'DESC' },
            take: limit,
            select: ['id', 'tg_id', 'username', 'first_name', 'tasks_completed'],
        });
        return {
            top_by_balance: topByBalance,
            top_by_earned: topByEarned,
            top_by_tasks: topByTasks,
        };
    }
};
exports.StatsService = StatsService;
exports.StatsService = StatsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(real_stats_snapshot_entity_1.RealStatsSnapshot)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(payout_entity_1.Payout)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        fake_stats_service_1.FakeStatsService])
], StatsService);
//# sourceMappingURL=stats.service.js.map