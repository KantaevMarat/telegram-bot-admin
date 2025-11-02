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
var ChannelsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const channel_entity_1 = require("../../entities/channel.entity");
const sync_service_1 = require("../sync/sync.service");
let ChannelsService = ChannelsService_1 = class ChannelsService {
    constructor(channelRepo, syncService) {
        this.channelRepo = channelRepo;
        this.syncService = syncService;
        this.logger = new common_1.Logger(ChannelsService_1.name);
    }
    async findAll() {
        return this.channelRepo.find({
            order: { order: 'ASC', created_at: 'ASC' },
        });
    }
    async findActive() {
        return this.channelRepo.find({
            where: { is_active: true },
            order: { order: 'ASC', created_at: 'ASC' },
        });
    }
    async findOne(id) {
        const channel = await this.channelRepo.findOne({ where: { id } });
        if (!channel) {
            throw new common_1.NotFoundException(`Channel with ID ${id} not found`);
        }
        return channel;
    }
    async create(dto) {
        let channelId = dto.channel_id.trim();
        if (channelId.startsWith('@')) {
            channelId = channelId.substring(1);
        }
        let username = dto.username;
        if (!username && channelId.includes('t.me/')) {
            const match = channelId.match(/t\.me\/([^/?]+)/);
            if (match) {
                username = match[1];
                channelId = username;
            }
        }
        const channel = this.channelRepo.create({
            ...dto,
            channel_id: channelId,
            username: username || channelId,
            is_active: dto.is_active ?? true,
        });
        const saved = await this.channelRepo.save(channel);
        await this.syncService.publish('channels.created', { id: saved.id });
        this.logger.log(`Channel created: ${saved.title} (${saved.channel_id})`);
        return saved;
    }
    async update(id, dto) {
        const channel = await this.findOne(id);
        Object.assign(channel, dto);
        const updated = await this.channelRepo.save(channel);
        await this.syncService.publish('channels.updated', { id: updated.id });
        this.logger.log(`Channel updated: ${updated.title}`);
        return updated;
    }
    async remove(id) {
        const channel = await this.findOne(id);
        await this.channelRepo.remove(channel);
        await this.syncService.publish('channels.deleted', { id });
        this.logger.log(`Channel removed: ${channel.title}`);
    }
    async toggleActive(id) {
        const channel = await this.findOne(id);
        channel.is_active = !channel.is_active;
        const updated = await this.channelRepo.save(channel);
        await this.syncService.publish('channels.updated', { id: updated.id });
        return updated;
    }
    async reorder(ids) {
        for (let i = 0; i < ids.length; i++) {
            await this.channelRepo.update(ids[i], { order: i });
        }
        await this.syncService.publish('channels.reordered', {});
    }
};
exports.ChannelsService = ChannelsService;
exports.ChannelsService = ChannelsService = ChannelsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(channel_entity_1.Channel)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        sync_service_1.SyncService])
], ChannelsService);
//# sourceMappingURL=channels.service.js.map