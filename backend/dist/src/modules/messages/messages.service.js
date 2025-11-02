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
var MessagesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const message_entity_1 = require("../../entities/message.entity");
const user_entity_1 = require("../../entities/user.entity");
const sync_service_1 = require("../sync/sync.service");
const bot_service_1 = require("../bot/bot.service");
let MessagesService = MessagesService_1 = class MessagesService {
    constructor(messageRepo, userRepo, syncService, botService) {
        this.messageRepo = messageRepo;
        this.userRepo = userRepo;
        this.syncService = syncService;
        this.botService = botService;
        this.logger = new common_1.Logger(MessagesService_1.name);
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
            .set({
            is_read: true,
            status: 'read',
            read_at: () => 'CURRENT_TIMESTAMP'
        })
            .where('user_id = :userId AND from_admin_tg_id IS NULL AND is_read = false', { userId })
            .execute());
        (await this.messageRepo
            .createQueryBuilder()
            .update(message_entity_1.Message)
            .set({
            status: 'delivered',
            delivered_at: () => 'CURRENT_TIMESTAMP'
        })
            .where('user_id = :userId AND from_admin_tg_id IS NOT NULL AND status = :status', {
            userId,
            status: 'sent'
        })
            .execute());
        return messages;
    }
    async sendMessage(userId, text, adminTgId, mediaUrl) {
        const message = this.messageRepo.create({
            user_id: userId,
            from_admin_tg_id: adminTgId,
            text: text || '',
            media_url: mediaUrl,
            is_read: true,
            status: 'sent',
        });
        const savedMessage = await this.messageRepo.save(message);
        await this.syncService.publish('messages.created', {
            id: savedMessage.id,
            userId,
            fromAdmin: true
        });
        try {
            const user = await this.userRepo.findOne({ where: { id: userId } });
            if (user && user.tg_id) {
                this.logger.log(`Sending message to Telegram user ${user.tg_id}`);
                const messageText = text || '';
                if (mediaUrl) {
                    await this.botService.sendMessageWithMedia(user.tg_id, messageText, mediaUrl);
                }
                else if (messageText) {
                    await this.botService.sendMessage(user.tg_id, messageText);
                }
                this.logger.log(`✅ Message sent to Telegram user ${user.tg_id}`);
            }
            else {
                this.logger.warn(`User not found or no tg_id: ${userId}`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to send Telegram message to user ${userId}:`, error);
        }
        return savedMessage;
    }
    async createUserMessage(userId, text, mediaUrl) {
        const message = this.messageRepo.create({
            user_id: userId,
            from_admin_tg_id: null,
            text,
            media_url: mediaUrl,
            is_read: false,
        });
        const savedMessage = await this.messageRepo.save(message);
        await this.syncService.publish('messages.created', {
            id: savedMessage.id,
            userId,
            fromAdmin: false
        });
        return savedMessage;
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
exports.MessagesService = MessagesService = MessagesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => bot_service_1.BotService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        sync_service_1.SyncService,
        bot_service_1.BotService])
], MessagesService);
//# sourceMappingURL=messages.service.js.map