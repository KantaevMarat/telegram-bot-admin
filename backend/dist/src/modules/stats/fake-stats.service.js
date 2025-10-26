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
var FakeStatsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeStatsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const schedule_1 = require("@nestjs/schedule");
const config_1 = require("@nestjs/config");
const fake_stats_entity_1 = require("../../entities/fake-stats.entity");
const real_stats_snapshot_entity_1 = require("../../entities/real-stats-snapshot.entity");
const user_entity_1 = require("../../entities/user.entity");
let FakeStatsService = FakeStatsService_1 = class FakeStatsService {
    constructor(fakeStatsRepo, realStatsRepo, userRepo, configService) {
        this.fakeStatsRepo = fakeStatsRepo;
        this.realStatsRepo = realStatsRepo;
        this.userRepo = userRepo;
        this.configService = configService;
        this.logger = new common_1.Logger(FakeStatsService_1.name);
    }
    async updateFakeStatsCron() {
        this.logger.log('🔄 Running fake stats update (cron)...');
        await this.generateAndSaveFakeStats();
    }
    async regenerateFakeStats() {
        this.logger.log('🔄 Manually regenerating fake stats...');
        return await this.generateAndSaveFakeStats();
    }
    async getLatestFakeStats() {
        let latest = await this.fakeStatsRepo
            .createQueryBuilder('fake_stats')
            .orderBy('fake_stats.calculated_at', 'DESC')
            .limit(1)
            .getOne();
        if (!latest) {
            latest = await this.initializeFakeStats();
        }
        return latest;
    }
    async getFakeStatsHistory(limit = 100) {
        return await this.fakeStatsRepo.find({
            order: { calculated_at: 'DESC' },
            take: limit,
        });
    }
    async initializeFakeStats() {
        const realStats = await this.getRealStats();
        const fakeStats = this.fakeStatsRepo.create({
            online: Math.round(realStats.users_count * 0.8),
            active: Math.round(realStats.users_count * 1.2),
            paid_usdt: realStats.total_earned * 1.15,
        });
        await this.fakeStatsRepo.save(fakeStats);
        this.logger.log('✅ Initialized fake stats');
        return fakeStats;
    }
    async generateAndSaveFakeStats() {
        const realStats = await this.getRealStats();
        await this.saveRealStatsSnapshot(realStats);
        const previousFake = await this.getLatestFakeStats();
        const maxDeltaPercent = this.configService.get('FAKE_STATS_MAX_DELTA_PERCENT', 15);
        const trendMin = this.configService.get('FAKE_STATS_TREND_MIN', -0.02);
        const trendMax = this.configService.get('FAKE_STATS_TREND_MAX', 0.03);
        const noiseStdDev = this.configService.get('FAKE_STATS_NOISE_STDDEV', 0.01);
        const newFakeOnline = this.smoothRandomWalk(previousFake.online, realStats.users_count, maxDeltaPercent, trendMin, trendMax, noiseStdDev);
        const newFakeActive = this.smoothRandomWalk(previousFake.active, realStats.users_count, maxDeltaPercent, trendMin, trendMax, noiseStdDev);
        const paidTrendMin = Math.random() < 0.7 ? 0 : trendMin;
        const paidTrendMax = trendMax * 1.5;
        const newFakePaid = this.smoothRandomWalk(previousFake.paid_usdt, realStats.total_earned, maxDeltaPercent, paidTrendMin, paidTrendMax, noiseStdDev * 0.5, true);
        const newFakeStats = this.fakeStatsRepo.create({
            online: Math.round(newFakeOnline),
            active: Math.round(newFakeActive),
            paid_usdt: Math.round(newFakePaid * 100) / 100,
        });
        await this.fakeStatsRepo.save(newFakeStats);
        this.logger.log(`✅ Fake stats updated: online=${newFakeStats.online}, active=${newFakeStats.active}, paid=${newFakeStats.paid_usdt}`);
        return newFakeStats;
    }
    smoothRandomWalk(previousValue, realValue, maxDeltaPercent, trendMin, trendMax, noiseStdDev, onlyGrowth = false) {
        const drift = this.randomUniform(trendMin, trendMax);
        const noise = this.randomGaussian(0, noiseStdDev);
        const hour = new Date().getHours();
        const seasonal = Math.sin((hour * Math.PI) / 12) * 0.01;
        let multiplier = 1 + drift + noise + seasonal;
        if (onlyGrowth && multiplier < 1) {
            multiplier = 1 + Math.abs(drift) * 0.5 + Math.abs(noise) * 0.5;
        }
        let newValue = previousValue * multiplier;
        const minBound = realValue * (1 - maxDeltaPercent / 100);
        const maxBound = realValue * (1 + maxDeltaPercent / 100);
        newValue = this.clamp(newValue, minBound, maxBound);
        return newValue;
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
        return {
            users_count: usersCount || 0,
            total_balance: parseFloat(totalBalanceResult?.total || '0'),
            total_earned: parseFloat(totalEarnedResult?.total || '0'),
            active_users_24h: activeUsers24h || 0,
        };
    }
    async saveRealStatsSnapshot(realStats) {
        const snapshot = this.realStatsRepo.create(realStats);
        await this.realStatsRepo.save(snapshot);
    }
    randomUniform(min, max) {
        return Math.random() * (max - min) + min;
    }
    randomGaussian(mean, stdDev) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return z0 * stdDev + mean;
    }
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
};
exports.FakeStatsService = FakeStatsService;
__decorate([
    (0, schedule_1.Cron)('0 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FakeStatsService.prototype, "updateFakeStatsCron", null);
exports.FakeStatsService = FakeStatsService = FakeStatsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(fake_stats_entity_1.FakeStats)),
    __param(1, (0, typeorm_1.InjectRepository)(real_stats_snapshot_entity_1.RealStatsSnapshot)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        config_1.ConfigService])
], FakeStatsService);
//# sourceMappingURL=fake-stats.service.js.map