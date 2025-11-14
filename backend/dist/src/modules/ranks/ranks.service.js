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
var RanksService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RanksService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_rank_entity_1 = require("../../entities/user-rank.entity");
const rank_settings_entity_1 = require("../../entities/rank-settings.entity");
const user_entity_1 = require("../../entities/user.entity");
const schedule_1 = require("@nestjs/schedule");
let RanksService = RanksService_1 = class RanksService {
    constructor(rankRepo, settingsRepo, userRepo) {
        this.rankRepo = rankRepo;
        this.settingsRepo = settingsRepo;
        this.userRepo = userRepo;
        this.logger = new common_1.Logger(RanksService_1.name);
    }
    async getUserRank(userId) {
        let rank = await this.rankRepo.findOne({ where: { user_id: userId } });
        if (!rank) {
            rank = this.rankRepo.create({
                user_id: userId,
                current_rank: user_rank_entity_1.RankLevel.STONE,
                bonus_percentage: 0,
            });
            await this.rankRepo.save(rank);
            this.logger.log(`Created new rank for user ${userId}: STONE`);
        }
        return rank;
    }
    async checkAndUpdateRank(userId) {
        const rank = await this.getUserRank(userId);
        const oldRank = rank.current_rank;
        const settings = await this.getSettings();
        if (rank.current_rank === user_rank_entity_1.RankLevel.STONE && rank.channels_subscribed) {
            rank.current_rank = user_rank_entity_1.RankLevel.BRONZE;
            rank.bonus_percentage = settings.bronze_bonus;
            await this.rankRepo.save(rank);
            this.logger.log(`User ${userId} promoted to BRONZE`);
            return { rank, leveledUp: true, newLevel: user_rank_entity_1.RankLevel.BRONZE };
        }
        if (rank.current_rank === user_rank_entity_1.RankLevel.BRONZE &&
            rank.tasks_completed >= settings.silver_required_tasks &&
            rank.referrals_count >= settings.silver_required_referrals) {
            rank.current_rank = user_rank_entity_1.RankLevel.SILVER;
            rank.bonus_percentage = settings.silver_bonus;
            await this.rankRepo.save(rank);
            this.logger.log(`User ${userId} promoted to SILVER`);
            return { rank, leveledUp: true, newLevel: user_rank_entity_1.RankLevel.SILVER };
        }
        if (rank.current_rank === user_rank_entity_1.RankLevel.SILVER &&
            rank.tasks_completed >= settings.gold_required_tasks &&
            rank.referrals_count >= settings.gold_required_referrals) {
            rank.current_rank = user_rank_entity_1.RankLevel.GOLD;
            rank.bonus_percentage = settings.gold_bonus;
            rank.notified_gold_achieved = false;
            await this.rankRepo.save(rank);
            this.logger.log(`User ${userId} promoted to GOLD`);
            return { rank, leveledUp: true, newLevel: user_rank_entity_1.RankLevel.GOLD };
        }
        if (rank.platinum_active && rank.platinum_expires_at) {
            const now = new Date();
            if (now > rank.platinum_expires_at) {
                rank.platinum_active = false;
                rank.current_rank = user_rank_entity_1.RankLevel.GOLD;
                rank.bonus_percentage = settings.gold_bonus;
                await this.rankRepo.save(rank);
                this.logger.log(`User ${userId} platinum subscription expired, returned to GOLD`);
            }
        }
        return { rank, leveledUp: false };
    }
    applyRankBonus(baseReward, bonusPercentage) {
        return parseFloat((baseReward * (1 + bonusPercentage / 100)).toFixed(2));
    }
    async incrementTasksCompleted(userId) {
        const rank = await this.getUserRank(userId);
        rank.tasks_completed++;
        await this.rankRepo.save(rank);
        await this.checkAndUpdateRank(userId);
    }
    async incrementReferralsCount(userId) {
        const rank = await this.getUserRank(userId);
        rank.referrals_count++;
        await this.rankRepo.save(rank);
        await this.checkAndUpdateRank(userId);
    }
    async setChannelsSubscribed(userId, subscribed) {
        const rank = await this.getUserRank(userId);
        rank.channels_subscribed = subscribed;
        await this.rankRepo.save(rank);
        await this.checkAndUpdateRank(userId);
    }
    async activatePlatinum(userId, durationDays) {
        const rank = await this.getUserRank(userId);
        const settings = await this.getSettings();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);
        rank.current_rank = user_rank_entity_1.RankLevel.PLATINUM;
        rank.platinum_active = true;
        rank.platinum_expires_at = expiresAt;
        rank.bonus_percentage = settings.platinum_bonus;
        await this.rankRepo.save(rank);
        this.logger.log(`Activated platinum subscription for user ${userId} until ${expiresAt}`);
        return rank;
    }
    async getSettings() {
        const settings = await this.settingsRepo.findOne({ where: {} });
        if (!settings) {
            return await this.settingsRepo.save(this.settingsRepo.create({}));
        }
        return settings;
    }
    async updateSettings(data) {
        let settings = await this.getSettings();
        Object.assign(settings, data);
        return await this.settingsRepo.save(settings);
    }
    async getRankProgress(userId) {
        const rank = await this.getUserRank(userId);
        const settings = await this.getSettings();
        let nextRank = null;
        let tasksRequired = 0;
        let referralsRequired = 0;
        switch (rank.current_rank) {
            case user_rank_entity_1.RankLevel.STONE:
                nextRank = user_rank_entity_1.RankLevel.BRONZE;
                tasksRequired = 0;
                referralsRequired = 0;
                break;
            case user_rank_entity_1.RankLevel.BRONZE:
                nextRank = user_rank_entity_1.RankLevel.SILVER;
                tasksRequired = settings.silver_required_tasks;
                referralsRequired = settings.silver_required_referrals;
                break;
            case user_rank_entity_1.RankLevel.SILVER:
                nextRank = user_rank_entity_1.RankLevel.GOLD;
                tasksRequired = settings.gold_required_tasks;
                referralsRequired = settings.gold_required_referrals;
                break;
            case user_rank_entity_1.RankLevel.GOLD:
                nextRank = user_rank_entity_1.RankLevel.PLATINUM;
                tasksRequired = settings.gold_required_tasks;
                referralsRequired = settings.gold_required_referrals;
                break;
            case user_rank_entity_1.RankLevel.PLATINUM:
                nextRank = null;
                break;
        }
        const tasksProgress = Math.min(100, (rank.tasks_completed / tasksRequired) * 100);
        const referralsProgress = Math.min(100, (rank.referrals_count / referralsRequired) * 100);
        const overallProgress = (tasksProgress + referralsProgress) / 2;
        return {
            currentRank: rank.current_rank,
            nextRank,
            progress: overallProgress,
            tasksProgress: { current: rank.tasks_completed, required: tasksRequired },
            referralsProgress: { current: rank.referrals_count, required: referralsRequired },
        };
    }
    async checkExpiringSubscriptions() {
        this.logger.log('Checking expiring platinum subscriptions...');
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        const expiringRanks = await this.rankRepo.find({
            where: {
                platinum_active: true,
                platinum_expires_at: (0, typeorm_2.MoreThan)(new Date()),
            },
            relations: ['user'],
        });
        for (const rank of expiringRanks) {
            if (rank.platinum_expires_at && rank.platinum_expires_at <= threeDaysFromNow) {
                this.logger.log(`User ${rank.user_id} platinum subscription expires soon`);
            }
        }
    }
    async getRankStatistics() {
        const stats = await this.rankRepo
            .createQueryBuilder('rank')
            .select('rank.current_rank', 'rank')
            .addSelect('COUNT(*)', 'count')
            .groupBy('rank.current_rank')
            .getRawMany();
        const platinumActive = await this.rankRepo.count({ where: { platinum_active: true } });
        return {
            byRank: stats,
            platinumActive,
            total: await this.rankRepo.count(),
        };
    }
};
exports.RanksService = RanksService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_10AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RanksService.prototype, "checkExpiringSubscriptions", null);
exports.RanksService = RanksService = RanksService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_rank_entity_1.UserRank)),
    __param(1, (0, typeorm_1.InjectRepository)(rank_settings_entity_1.RankSettings)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], RanksService);
//# sourceMappingURL=ranks.service.js.map