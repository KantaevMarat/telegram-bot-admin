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
var BroadcastService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bullmq_1 = require("@nestjs/bullmq");
const typeorm_2 = require("typeorm");
const bullmq_2 = require("bullmq");
const schedule_1 = require("@nestjs/schedule");
const user_entity_1 = require("../../entities/user.entity");
const broadcast_entity_1 = require("../../entities/broadcast.entity");
let BroadcastService = BroadcastService_1 = class BroadcastService {
    constructor(userRepo, broadcastRepo, broadcastQueue) {
        this.userRepo = userRepo;
        this.broadcastRepo = broadcastRepo;
        this.broadcastQueue = broadcastQueue;
        this.logger = new common_1.Logger(BroadcastService_1.name);
    }
    async createBroadcast(broadcastDto) {
        const broadcast = this.broadcastRepo.create({
            text: broadcastDto.text,
            media_urls: broadcastDto.media_urls || null,
            scheduled_at: broadcastDto.scheduled_at ? new Date(broadcastDto.scheduled_at) : null,
            status: broadcastDto.scheduled_at ? 'scheduled' : 'draft',
            batch_size: broadcastDto.batchSize || 30,
            throttle_ms: broadcastDto.throttle || 1000,
            created_by_admin_tg_id: null,
        });
        const saved = await this.broadcastRepo.save(broadcast);
        if (!broadcastDto.scheduled_at) {
            await this.executeBroadcast(saved.id);
        }
        return saved;
    }
    async getAllBroadcasts() {
        return this.broadcastRepo.find({
            order: { created_at: 'DESC' },
        });
    }
    async getBroadcastById(id) {
        return this.broadcastRepo.findOne({ where: { id } });
    }
    async deleteBroadcast(id) {
        const broadcast = await this.getBroadcastById(id);
        if (broadcast && broadcast.status === 'scheduled') {
            await this.broadcastRepo.delete(id);
            return { success: true };
        }
        throw new Error('Can only delete scheduled broadcasts');
    }
    async executeBroadcast(broadcastId) {
        const broadcast = await this.getBroadcastById(broadcastId);
        if (!broadcast) {
            throw new Error('Broadcast not found');
        }
        if (broadcast.status === 'sending' || broadcast.status === 'completed') {
            throw new Error('Broadcast already sent or in progress');
        }
        const users = await this.userRepo.find({
            where: { status: 'active' },
            select: ['id', 'tg_id'],
        });
        await this.broadcastRepo.update(broadcastId, {
            status: 'sending',
            started_at: new Date(),
            total_users: users.length,
        });
        this.logger.log(`Starting broadcast ${broadcastId} for ${users.length} users`);
        const batchSize = broadcast.batch_size;
        const throttle = broadcast.throttle_ms;
        for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);
            await this.broadcastQueue.add('send-batch', {
                broadcastId,
                users: batch,
                text: broadcast.text,
                media_urls: broadcast.media_urls,
            }, {
                delay: Math.floor(i / batchSize) * throttle,
            });
        }
        return {
            success: true,
            message: `Broadcast started for ${users.length} users`,
            total_users: users.length,
            batches: Math.ceil(users.length / batchSize),
        };
    }
    async updateBroadcastProgress(broadcastId, sent, failed) {
        const broadcast = await this.getBroadcastById(broadcastId);
        if (!broadcast) {
            return;
        }
        const newSentCount = broadcast.sent_count + sent;
        const newFailedCount = broadcast.failed_count + failed;
        const total = newSentCount + newFailedCount;
        if (total >= broadcast.total_users) {
            await this.broadcastRepo.update(broadcastId, {
                sent_count: newSentCount,
                failed_count: newFailedCount,
                status: 'completed',
                completed_at: new Date(),
            });
            this.logger.log(`Broadcast ${broadcastId} completed: ${newSentCount}/${broadcast.total_users} sent`);
        }
        else {
            await this.broadcastRepo.update(broadcastId, {
                sent_count: newSentCount,
                failed_count: newFailedCount,
            });
        }
    }
    async checkScheduledBroadcasts() {
        const now = new Date();
        const scheduled = await this.broadcastRepo.find({
            where: {
                status: 'scheduled',
                scheduled_at: (0, typeorm_2.LessThanOrEqual)(now),
            },
        });
        for (const broadcast of scheduled) {
            this.logger.log(`Executing scheduled broadcast ${broadcast.id}`);
            try {
                await this.executeBroadcast(broadcast.id);
            }
            catch (error) {
                this.logger.error(`Failed to execute broadcast ${broadcast.id}:`, error);
                await this.broadcastRepo.update(broadcast.id, {
                    status: 'failed',
                });
            }
        }
    }
    async sendBroadcast(broadcastDto) {
        return this.createBroadcast(broadcastDto);
    }
};
exports.BroadcastService = BroadcastService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BroadcastService.prototype, "checkScheduledBroadcasts", null);
exports.BroadcastService = BroadcastService = BroadcastService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(broadcast_entity_1.Broadcast)),
    __param(2, (0, bullmq_1.InjectQueue)('broadcast')),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        bullmq_2.Queue])
], BroadcastService);
//# sourceMappingURL=broadcast.service.js.map