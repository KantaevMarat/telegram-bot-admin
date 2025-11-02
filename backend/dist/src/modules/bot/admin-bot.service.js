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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AdminBotService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminBotService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const axios_1 = __importDefault(require("axios"));
const admin_entity_1 = require("../../entities/admin.entity");
let AdminBotService = AdminBotService_1 = class AdminBotService {
    constructor(configService, adminRepo) {
        this.configService = configService;
        this.adminRepo = adminRepo;
        this.logger = new common_1.Logger(AdminBotService_1.name);
        this.botToken = '';
        this.webAppUrl = '';
        this.isConfigured = false;
        this.pollingInterval = null;
        this.pollingOffset = 0;
        this.botToken = this.configService.get('ADMIN_BOT_TOKEN') || '';
        this.webAppUrl = this.configService.get('TELEGRAM_WEB_APP_URL') || '';
        this.isConfigured = !!(this.botToken && this.webAppUrl);
        if (!this.isConfigured) {
            this.logger.warn('⚠️ Admin bot is not configured (missing ADMIN_BOT_TOKEN or TELEGRAM_WEB_APP_URL)');
        }
        else {
            this.logger.log(`✅ Admin bot configured with token: ${this.botToken.substring(0, 10)}...`);
            this.logger.log(`✅ Web App URL: ${this.webAppUrl}`);
        }
    }
    async onModuleInit() {
        if (this.isConfigured) {
            this.logger.log('🤖 Admin Bot initialized');
            await this.setupMenuButton();
            if (process.env.NODE_ENV === 'development' || true) {
                this.logger.log('🚀 Starting admin bot polling...');
                this.startPolling();
            }
        }
    }
    async onModuleDestroy() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            this.logger.log('🛑 Admin bot polling stopped');
        }
    }
    async setupMenuButton() {
        try {
            const url = `https://api.telegram.org/bot${this.botToken}/setChatMenuButton`;
            await axios_1.default.post(url, {
                menu_button: {
                    type: 'web_app',
                    text: '📊 Admin Panel',
                    web_app: {
                        url: this.webAppUrl,
                    },
                },
            });
            this.logger.log('✅ Menu button configured successfully');
        }
        catch (error) {
            this.logger.error('❌ Failed to setup menu button:', error.message);
        }
    }
    async sendWelcomeMessage(chatId, firstName, isAdmin = false) {
        if (!this.isConfigured)
            return;
        try {
            let text = '';
            if (isAdmin) {
                text = `👋 Привет, ${firstName}!\n\n` +
                    `🎛 Добро пожаловать в <b>Админ-панель</b>\n\n` +
                    `✨ Доступные функции:\n` +
                    `• 👥 Управление пользователями\n` +
                    `• 📋 Создание и редактирование заданий\n` +
                    `• 📊 Просмотр статистики\n` +
                    `• 📢 Массовые рассылки\n` +
                    `• 💸 Управление выплатами\n` +
                    `• ⚙️ Настройки системы\n\n` +
                    `📱 Нажмите кнопку ниже для открытия панели`;
            }
            else {
                text = `👋 Привет, ${firstName}!\n\n` +
                    `❌ У вас нет доступа к админ-панели.\n\n` +
                    `Если вы администратор, обратитесь к главному администратору для получения доступа.`;
            }
            await this.sendMessage(chatId, text, isAdmin ? this.getWebAppKeyboard() : undefined);
        }
        catch (error) {
            this.logger.error('Failed to send welcome message:', error.message);
        }
    }
    getWebAppKeyboard() {
        return {
            inline_keyboard: [
                [
                    {
                        text: '📊 Открыть админ-панель',
                        web_app: { url: this.webAppUrl },
                    },
                ],
            ],
        };
    }
    async sendMessage(chatId, text, replyMarkup) {
        if (!this.isConfigured)
            return;
        try {
            const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
            await axios_1.default.post(url, {
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
                reply_markup: replyMarkup,
            });
        }
        catch (error) {
            this.logger.error('Failed to send message:', error.message);
        }
    }
    async handleMessage(message) {
        if (!this.isConfigured)
            return;
        const chatId = message.chat.id.toString();
        const text = message.text;
        const from = message.from;
        const tgId = from.id.toString();
        const admin = await this.adminRepo.findOne({ where: { tg_id: tgId } });
        const isAdmin = !!admin;
        this.logger.log(`📨 Message from ${from.username || from.first_name} (${tgId}): ${text}`);
        this.logger.log(`🔐 Admin check: ${isAdmin ? 'YES' : 'NO'}`);
        if (text === '/start') {
            await this.sendWelcomeMessage(chatId, from.first_name, isAdmin);
        }
        else if (text === '/help') {
            if (isAdmin) {
                const helpText = `
📊 <b>Админ-панель бота</b>

Используйте кнопку для открытия панели управления.

<b>✨ Доступные функции:</b>
• 👥 Управление пользователями
• 📋 Управление заданиями
• 📊 Статистика и аналитика
• 📢 Массовые рассылки
• 💸 Управление выплатами
• 🎯 Настройка сценариев
• 📱 Управление каналами
• ⚙️ Настройки системы

<b>💡 Команды:</b>
/start - Главное меню
/help - Эта справка
/stats - Быстрая статистика
/info - Информация о системе`;
                await this.sendMessage(chatId, helpText, this.getWebAppKeyboard());
            }
            else {
                await this.sendMessage(chatId, '❌ У вас нет доступа к админ-панели.\n\nОбратитесь к главному администратору для получения доступа.');
            }
        }
        else if (text === '/stats' && isAdmin) {
            await this.sendQuickStats(chatId);
        }
        else if (text === '/info' && isAdmin) {
            await this.sendSystemInfo(chatId);
        }
        else {
            if (isAdmin) {
                await this.sendMessage(chatId, '📱 Используйте кнопку ниже для открытия админ-панели:', this.getWebAppKeyboard());
            }
            else {
                await this.sendMessage(chatId, '❌ У вас нет доступа к админ-панели.\n\nЕсли вы администратор, обратитесь к главному администратору.');
            }
        }
    }
    async sendQuickStats(chatId) {
        try {
            const text = `
📊 <b>Быстрая статистика</b>

⏰ Обновлено: ${new Date().toLocaleString('ru-RU')}

💡 Для полной статистики откройте админ-панель.`;
            await this.sendMessage(chatId, text, this.getWebAppKeyboard());
        }
        catch (error) {
            this.logger.error('Failed to send quick stats:', error.message);
        }
    }
    async sendSystemInfo(chatId) {
        try {
            const nodeVersion = process.version;
            const uptime = Math.floor(process.uptime());
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const text = `
ℹ️ <b>Информация о системе</b>

🖥 Node.js: ${nodeVersion}
⏱ Uptime: ${hours}ч ${minutes}м
🔧 Environment: ${process.env.NODE_ENV || 'development'}

📱 Для управления системой откройте админ-панель.`;
            await this.sendMessage(chatId, text, this.getWebAppKeyboard());
        }
        catch (error) {
            this.logger.error('Failed to send system info:', error.message);
        }
    }
    startPolling() {
        if (!this.isConfigured) {
            this.logger.warn('⚠️ Admin bot polling is disabled (not configured)');
            return;
        }
        this.logger.log('🚀 Starting admin bot polling...');
        this.pollingInterval = setInterval(() => { }, 1000000);
        this.pollUpdates();
    }
    async pollUpdates() {
        try {
            const url = `https://api.telegram.org/bot${this.botToken}/getUpdates`;
            this.logger.debug(`🔍 Admin bot polling with offset: ${this.pollingOffset + 1}`);
            const response = await axios_1.default.get(url, {
                params: {
                    offset: this.pollingOffset,
                    limit: 100,
                    timeout: 30,
                },
            });
            this.logger.debug(`📡 Admin bot API response: ${response.data.ok}, updates: ${response.data.result?.length || 0}`);
            const updates = response.data.result;
            if (updates && updates.length > 0) {
                this.logger.log(`📨 Admin bot received ${updates.length} update(s)`);
                for (const update of updates) {
                    this.logger.debug(`📨 Processing admin update ${update.update_id}`);
                    if (update.message) {
                        await this.handleMessage(update.message);
                    }
                    this.pollingOffset = update.update_id + 1;
                }
            }
            else {
                this.logger.debug('📭 No new admin updates');
            }
            if (this.pollingInterval) {
                this.pollUpdates();
            }
        }
        catch (error) {
            this.logger.error('Admin bot polling error:', error.response?.status, error.response?.data || error.message);
            if (this.pollingInterval) {
                setTimeout(() => this.pollUpdates(), 5000);
            }
        }
    }
    async notifyAdmin(adminTgId, message, keyboard) {
        if (!this.isConfigured)
            return;
        try {
            await this.sendMessage(adminTgId, message, keyboard);
            this.logger.log(`✅ Notification sent to admin ${adminTgId}`);
        }
        catch (error) {
            this.logger.error(`Failed to notify admin ${adminTgId}:`, error.message);
        }
    }
    async notifyAllAdmins(message, keyboard) {
        if (!this.isConfigured)
            return;
        try {
            const admins = await this.adminRepo.find();
            for (const admin of admins) {
                if (admin.tg_id) {
                    await this.notifyAdmin(admin.tg_id, message, keyboard);
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            this.logger.log(`✅ Notifications sent to ${admins.length} admins`);
        }
        catch (error) {
            this.logger.error('Failed to notify admins:', error.message);
        }
    }
};
exports.AdminBotService = AdminBotService;
exports.AdminBotService = AdminBotService = AdminBotService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(admin_entity_1.Admin)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository])
], AdminBotService);
//# sourceMappingURL=admin-bot.service.js.map