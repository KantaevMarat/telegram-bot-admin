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
        try {
            await this.generateAndSaveFakeStats();
        }
        catch (error) {
            this.logger.error('❌ Error updating fake stats:', error);
        }
    }
    async regenerateFakeStats() {
        try {
            this.logger.log('🔄 Manually regenerating fake stats...');
            return await this.generateAndSaveFakeStats();
        }
        catch (error) {
            this.logger.error('❌ Error regenerating fake stats:', error);
            this.logger.error('Stack trace:', error.stack);
            throw error;
        }
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
        const defaultValues = {
            online: 1250,
            active: 8420,
            paid_usdt: 45678.5,
        };
        const online = realStats.users_count > 0
            ? Math.round(realStats.users_count * 0.8)
            : defaultValues.online;
        const active = realStats.users_count > 0
            ? Math.round(realStats.users_count * 1.2)
            : defaultValues.active;
        const paid_usdt = realStats.total_earned > 0
            ? realStats.total_earned * 1.15
            : defaultValues.paid_usdt;
        const fakeStats = this.fakeStatsRepo.create({
            online,
            active,
            paid_usdt,
        });
        await this.fakeStatsRepo.save(fakeStats);
        this.logger.log('✅ Initialized fake stats', { online, active, paid_usdt });
        return fakeStats;
    }
    async generateAndSaveFakeStats() {
        this.logger.log('Step 1: Getting real stats...');
        const realStats = await this.getRealStats();
        this.logger.log(`Real stats: users=${realStats.users_count}, earned=${realStats.total_earned}`);
        this.logger.log('Step 2: Saving real stats snapshot...');
        await this.saveRealStatsSnapshot(realStats);
        this.logger.log('Step 3: Getting latest fake stats...');
        const previousFake = await this.getLatestFakeStats();
        this.logger.log(`Previous fake stats: online=${previousFake.online}, active=${previousFake.active}`);
        if (realStats.users_count === 0) {
            const defaultValues = {
                online: 1250 + Math.floor(Math.random() * 100 - 50),
                active: 8420 + Math.floor(Math.random() * 200 - 100),
                paid_usdt: 45678.5 + (Math.random() * 1000 - 500),
            };
            const newFakeStats = this.fakeStatsRepo.create({
                online: Math.max(1000, defaultValues.online),
                active: Math.max(5000, defaultValues.active),
                paid_usdt: Math.max(40000, Math.round(defaultValues.paid_usdt * 100) / 100),
            });
            await this.fakeStatsRepo.save(newFakeStats);
            this.logger.log(`✅ Fake stats updated (default values): online=${newFakeStats.online}, active=${newFakeStats.active}, paid=${newFakeStats.paid_usdt}`);
            return newFakeStats;
        }
        const maxDeltaPercent = this.configService.get('FAKE_STATS_MAX_DELTA_PERCENT', 15);
        const trendMin = this.configService.get('FAKE_STATS_TREND_MIN', -0.02);
        const trendMax = this.configService.get('FAKE_STATS_TREND_MAX', 0.03);
        const noiseStdDev = this.configService.get('FAKE_STATS_NOISE_STDDEV', 0.01);
        const newFakeOnline = this.smoothRandomWalk(previousFake.online, realStats.users_count, maxDeltaPercent, trendMin, trendMax, noiseStdDev);
        const newFakeActive = this.smoothRandomWalk(previousFake.active, realStats.users_count, maxDeltaPercent, trendMin, trendMax, noiseStdDev);
        const paidTrendMin = Math.random() < 0.7 ? 0 : trendMin;
        const paidTrendMax = trendMax * 1.5;
        const newFakePaid = this.smoothRandomWalk(previousFake.paid_usdt, realStats.total_earned, maxDeltaPercent, paidTrendMin, paidTrendMax, noiseStdDev * 0.5, true);
        const defaultValues = {
            online: 1250,
            active: 8420,
            paid_usdt: 45678.5,
        };
        const newFakeStats = this.fakeStatsRepo.create({
            online: Math.round(isNaN(newFakeOnline) ? defaultValues.online : newFakeOnline),
            active: Math.round(isNaN(newFakeActive) ? defaultValues.active : newFakeActive),
            paid_usdt: isNaN(newFakePaid) ? defaultValues.paid_usdt : Math.round(newFakePaid * 100) / 100,
        });
        await this.fakeStatsRepo.save(newFakeStats);
        this.logger.log(`✅ Fake stats updated: online=${newFakeStats.online}, active=${newFakeStats.active}, paid=${newFakeStats.paid_usdt}`);
        return newFakeStats;
    }
    smoothRandomWalk(previousValue, realValue, maxDeltaPercent, trendMin, trendMax, noiseStdDev, onlyGrowth = false) {
        const targetMin = realValue * (1 - maxDeltaPercent / 100);
        const targetMax = realValue * (1 + maxDeltaPercent / 100);
        const trend = this.randomUniform(trendMin, trendMax);
        const target = (targetMin + targetMax) / 2;
        const drift = (target - previousValue) * 0.1;
        const noise = this.randomGaussian(0, noiseStdDev * previousValue);
        let newValue = previousValue + drift + trend * previousValue + noise;
        newValue = this.clamp(newValue, targetMin, targetMax);
        if (onlyGrowth && newValue < previousValue) {
            newValue = previousValue * (1 + Math.abs(noise) * 0.5);
            newValue = this.clamp(newValue, previousValue, targetMax);
        }
        return newValue;
    }
    async getRealStats() {
        const usersCount = await this.userRepo.count();
        const totalEarnedResult = await this.userRepo
            .createQueryBuilder('user')
            .select('COALESCE(SUM(user.total_earned), 0)', 'total')
            .getRawOne();
        const totalEarned = parseFloat(totalEarnedResult?.total || '0');
        return {
            users_count: usersCount,
            total_earned: totalEarned,
        };
    }
    async saveRealStatsSnapshot(realStats) {
        const snapshot = this.realStatsRepo.create({
            users_count: realStats.users_count,
            total_earned: realStats.total_earned,
        });
        await this.realStatsRepo.save(snapshot);
    }
    randomUniform(min, max) {
        return min + Math.random() * (max - min);
    }
    randomGaussian(mean, stdDev) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + z0 * stdDev;
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