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
exports.BroadcastService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bullmq_1 = require("@nestjs/bullmq");
const typeorm_2 = require("typeorm");
const bullmq_2 = require("bullmq");
const user_entity_1 = require("../../entities/user.entity");
let BroadcastService = class BroadcastService {
    constructor(userRepo, broadcastQueue) {
        this.userRepo = userRepo;
        this.broadcastQueue = broadcastQueue;
    }
    async sendBroadcast(broadcastDto) {
        const users = await this.userRepo.find({
            where: { status: 'active' },
            select: ['id', 'tg_id'],
        });
        const batchSize = broadcastDto.batchSize || 30;
        const throttle = broadcastDto.throttle || 1000;
        for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);
            await this.broadcastQueue.add('send-batch', {
                users: batch,
                text: broadcastDto.text,
                media_urls: broadcastDto.media_urls,
            }, {
                delay: Math.floor(i / batchSize) * throttle,
            });
        }
        return {
            success: true,
            message: `Broadcast scheduled for ${users.length} users`,
            total_users: users.length,
            batches: Math.ceil(users.length / batchSize),
        };
    }
};
exports.BroadcastService = BroadcastService;
exports.BroadcastService = BroadcastService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, bullmq_1.InjectQueue)('broadcast')),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        bullmq_2.Queue])
], BroadcastService);
//# sourceMappingURL=broadcast.service.js.map