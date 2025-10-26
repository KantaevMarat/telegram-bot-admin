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
exports.MessagesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const message_entity_1 = require("../../entities/message.entity");
const user_entity_1 = require("../../entities/user.entity");
let MessagesService = class MessagesService {
    constructor(messageRepo, userRepo) {
        this.messageRepo = messageRepo;
        this.userRepo = userRepo;
    }
    async getChats() {
        const chats = await this.userRepo
            .createQueryBuilder('user')
            .leftJoin('user.messages', 'message')
            .select([
            'user.id',
            'user.tg_id',
            'user.username',
            'user.first_name',
            'MAX(message.created_at) as last_message_time',
        ])
            .addSelect('SUM(CASE WHEN message.from_admin_tg_id IS NULL AND message.is_read = false THEN 1 ELSE 0 END)', 'unread_count')
            .groupBy('user.id')
            .having('MAX(message.created_at) IS NOT NULL')
            .orderBy('last_message_time', 'DESC')
            .getRawMany();
        return chats;
    }
    async getMessages(userId, limit = 100) {
        const messages = await this.messageRepo.find({
            where: { user_id: userId },
            order: { created_at: 'ASC' },
            take: limit,
        });
        (await this.messageRepo
            .createQueryBuilder()
            .update(message_entity_1.Message)
            .set({ is_read: true })
            .where('user_id = :userId AND from_admin_tg_id IS NULL AND is_read = false', { userId })
            .execute());
        return messages;
    }
    async sendMessage(userId, text, adminTgId, mediaUrl) {
        const message = this.messageRepo.create({
            user_id: userId,
            from_admin_tg_id: adminTgId,
            text,
            media_url: mediaUrl,
            is_read: true,
        });
        return await this.messageRepo.save(message);
    }
    async createUserMessage(userId, text, mediaUrl) {
        const message = this.messageRepo.create({
            user_id: userId,
            from_admin_tg_id: null,
            text,
            media_url: mediaUrl,
            is_read: false,
        });
        return await this.messageRepo.save(message);
    }
    async getUnreadCount() {
        return await this.messageRepo
            .createQueryBuilder('message')
            .where('message.from_admin_tg_id IS NULL')
            .andWhere('message.is_read = :isRead', { isRead: false })
            .getCount();
    }
};
exports.MessagesService = MessagesService;
exports.MessagesService = MessagesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], MessagesService);
//# sourceMappingURL=messages.service.js.map