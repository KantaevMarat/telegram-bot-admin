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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var BroadcastProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
let BroadcastProcessor = BroadcastProcessor_1 = class BroadcastProcessor extends bullmq_1.WorkerHost {
    constructor(configService) {
        super();
        this.configService = configService;
        this.logger = new common_1.Logger(BroadcastProcessor_1.name);
        this.botToken = '';
        this.botToken = this.configService.get('TELEGRAM_BOT_TOKEN') || '';
    }
    async process(job) {
        const { users, text, media_urls } = job.data;
        let successCount = 0;
        let errorCount = 0;
        for (const user of users) {
            try {
                await this.sendMessage(user.tg_id, text, media_urls);
                successCount++;
            }
            catch (error) {
                this.logger.error(`Failed to send to user ${user.tg_id}:`, error.message);
                errorCount++;
            }
        }
        this.logger.log(`Batch completed: ${successCount} success, ${errorCount} errors`);
        return { successCount, errorCount };
    }
    async sendMessage(chatId, text, mediaUrls) {
        const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
        await axios_1.default.post(url, {
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
        });
        if (mediaUrls && mediaUrls.length > 0) {
            for (const mediaUrl of mediaUrls) {
                await this.sendMedia(chatId, mediaUrl);
            }
        }
    }
    async sendMedia(chatId, mediaUrl) {
        const ext = mediaUrl.split('.').pop()?.toLowerCase() || '';
        let method = 'sendPhoto';
        if (['mp4', 'mov', 'avi'].includes(ext)) {
            method = 'sendVideo';
        }
        else if (['pdf', 'doc', 'docx'].includes(ext)) {
            method = 'sendDocument';
        }
        const url = `https://api.telegram.org/bot${this.botToken}/${method}`;
        await axios_1.default.post(url, {
            chat_id: chatId,
            [method === 'sendPhoto' ? 'photo' : method === 'sendVideo' ? 'video' : 'document']: mediaUrl,
        });
    }
};
exports.BroadcastProcessor = BroadcastProcessor;
exports.BroadcastProcessor = BroadcastProcessor = BroadcastProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('broadcast'),
    __metadata("design:paramtypes", [config_1.ConfigService])
], BroadcastProcessor);
//# sourceMappingURL=broadcast.processor.js.map