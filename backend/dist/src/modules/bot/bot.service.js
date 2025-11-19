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
var BotService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const user_entity_1 = require("../../entities/user.entity");
const button_entity_1 = require("../../entities/button.entity");
const task_entity_1 = require("../../entities/task.entity");
const user_task_entity_1 = require("../../entities/user-task.entity");
const scenario_entity_1 = require("../../entities/scenario.entity");
const balance_log_entity_1 = require("../../entities/balance-log.entity");
const admin_entity_1 = require("../../entities/admin.entity");
const fake_stats_service_1 = require("../stats/fake-stats.service");
const settings_service_1 = require("../settings/settings.service");
const messages_service_1 = require("../messages/messages.service");
const users_service_1 = require("../users/users.service");
const sync_service_1 = require("../sync/sync.service");
const channels_service_1 = require("../channels/channels.service");
const commands_service_1 = require("../commands/commands.service");
const ranks_service_1 = require("../ranks/ranks.service");
const premium_service_1 = require("../premium/premium.service");
let BotService = BotService_1 = class BotService {
    constructor(userRepo, buttonRepo, taskRepo, userTaskRepo, scenarioRepo, balanceLogRepo, adminRepo, configService, fakeStatsService, settingsService, messagesService, usersService, syncService, channelsService, commandsService, ranksService, premiumService) {
        this.userRepo = userRepo;
        this.buttonRepo = buttonRepo;
        this.taskRepo = taskRepo;
        this.userTaskRepo = userTaskRepo;
        this.scenarioRepo = scenarioRepo;
        this.balanceLogRepo = balanceLogRepo;
        this.adminRepo = adminRepo;
        this.configService = configService;
        this.fakeStatsService = fakeStatsService;
        this.settingsService = settingsService;
        this.messagesService = messagesService;
        this.usersService = usersService;
        this.syncService = syncService;
        this.channelsService = channelsService;
        this.commandsService = commandsService;
        this.ranksService = ranksService;
        this.premiumService = premiumService;
        this.logger = new common_1.Logger(BotService_1.name);
        this.botToken = '';
        this.pollingOffset = 0;
        this.pollingInterval = null;
        this.consecutiveErrors = 0;
        this.logger.log('BotService constructor called');
        const clientToken = this.configService.get('CLIENT_TG_BOT_TOKEN') || this.configService.get('CLIENT_BOT_TOKEN');
        const telegramToken = this.configService.get('TELEGRAM_BOT_TOKEN');
        this.botToken = clientToken || telegramToken || '';
        this.logger.log(`Bot token loaded: ${this.botToken ? 'YES' : 'NO'}`);
        this.logger.log(`Bot token preview: ${this.botToken ? this.botToken.substring(0, 10) + '...' : 'EMPTY'}`);
        if (clientToken) {
            this.logger.log(`✅ Using CLIENT_TG_BOT_TOKEN/CLIENT_BOT_TOKEN for client bot (${clientToken.substring(0, 10)}...)`);
        }
        else if (telegramToken) {
            this.logger.log(`⚠️ Using TELEGRAM_BOT_TOKEN as fallback (${telegramToken.substring(0, 10)}...)`);
        }
        if (!this.botToken) {
            this.logger.error('⚠️ Neither TELEGRAM_BOT_TOKEN nor CLIENT_BOT_TOKEN is set!');
        }
    }
    async onModuleInit() {
        this.syncService.on('buttons.created', () => {
            this.syncService.invalidateCache('buttons');
            this.syncService.invalidateCache('buttons:reply_keyboard');
            this.syncService.invalidateCache('buttons:main_keyboard');
            this.logger.debug('🔄 Invalidated button caches due to button.created');
        });
        this.syncService.on('buttons.updated', () => {
            this.syncService.invalidateCache('buttons');
            this.syncService.invalidateCache('buttons:reply_keyboard');
            this.syncService.invalidateCache('buttons:main_keyboard');
            this.logger.debug('🔄 Invalidated button caches due to button.updated');
        });
        this.syncService.on('buttons.deleted', () => {
            this.syncService.invalidateCache('buttons');
            this.syncService.invalidateCache('buttons:reply_keyboard');
            this.syncService.invalidateCache('buttons:main_keyboard');
            this.logger.debug('🔄 Invalidated button caches due to button.deleted');
        });
        this.syncService.on('scenarios.created', () => this.syncService.invalidateCache('scenarios'));
        this.syncService.on('scenarios.updated', () => this.syncService.invalidateCache('scenarios'));
        this.syncService.on('scenarios.deleted', () => this.syncService.invalidateCache('scenarios'));
        this.syncService.on('tasks.created', () => this.syncService.invalidateCache('tasks'));
        this.syncService.on('tasks.updated', () => this.syncService.invalidateCache('tasks'));
        this.syncService.on('tasks.deleted', () => this.syncService.invalidateCache('tasks'));
        this.logger.log('✅ BotService subscribed to sync events');
        if (this.botToken) {
            const useWebhook = this.configService.get('USE_WEBHOOK', 'false') === 'true';
            const webhookUrl = this.configService.get('TELEGRAM_WEBHOOK_URL');
            if (!useWebhook) {
                this.logger.log('🤖 Starting client bot polling (polling mode - default)');
                this.logger.log('💡 To use webhook mode, set USE_WEBHOOK=true and configure webhook via /api/bot/set-webhook');
                try {
                    this.logger.log('🔄 Deleting any existing webhook...');
                    await this.deleteWebhook(true);
                    this.logger.log('✅ Webhook deleted to avoid conflicts with polling');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    try {
                        const webhookInfo = await axios_1.default.get(`https://api.telegram.org/bot${this.botToken}/getWebhookInfo`);
                        if (webhookInfo.data.result?.url) {
                            this.logger.warn(`⚠️ Webhook still exists: ${webhookInfo.data.result.url}. Trying to delete again...`);
                            await this.deleteWebhook(true);
                            await new Promise(resolve => setTimeout(resolve, 3000));
                        }
                        else {
                            this.logger.log('✅ Webhook confirmed deleted');
                        }
                    }
                    catch (verifyError) {
                        this.logger.warn('⚠️ Could not verify webhook status:', verifyError.message);
                    }
                }
                catch (error) {
                    this.logger.warn('⚠️ Could not delete webhook (may not exist):', error.message);
                }
                this.pollingOffset = 0;
                this.consecutiveErrors = 0;
                this.startPolling();
            }
            else {
                this.logger.log('📡 Webhook mode: polling disabled (USE_WEBHOOK=true)');
                if (webhookUrl) {
                    this.logger.log(`📡 Webhook URL: ${webhookUrl}`);
                }
                else {
                    this.logger.warn('⚠️ USE_WEBHOOK=true but TELEGRAM_WEBHOOK_URL is not set! Bot will not receive updates.');
                }
            }
        }
        else {
            this.logger.error('❌ Client bot token is not set! Bot will not respond to users.');
        }
    }
    async onModuleDestroy() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.logger.log('🛑 Bot polling stopped');
    }
    async handleWebhook(update) {
        try {
            if (update.message) {
                await this.handleMessage(update.message);
            }
            else if (update.callback_query) {
                await this.handleCallbackQuery(update.callback_query);
            }
        }
        catch (error) {
            this.logger.error('Error handling webhook:', error);
        }
    }
    startPolling() {
        this.logger.log('🤖 Starting bot polling...');
        this.pollingInterval = setInterval(() => { }, 1000000);
        this.pollUpdates();
    }
    async pollUpdates() {
        try {
            const url = `https://api.telegram.org/bot${this.botToken}/getUpdates`;
            const offset = this.pollingOffset > 0 ? this.pollingOffset + 1 : 0;
            this.logger.debug(`🔍 Polling with offset: ${offset} (last processed: ${this.pollingOffset})`);
            const response = await axios_1.default.get(url, {
                params: {
                    offset: offset,
                    limit: 100,
                    timeout: 30,
                },
            });
            this.logger.debug(`📡 Telegram API response: ${response.data.ok}, updates: ${response.data.result?.length || 0}`);
            const updates = response.data.result;
            if (updates && updates.length > 0) {
                this.logger.log(`📨 Received ${updates.length} update(s)`);
                for (const update of updates) {
                    this.logger.debug(`📨 Processing update ${update.update_id}: ${update.message?.text || 'no text'}`);
                    await this.handleWebhook(update);
                    this.pollingOffset = Math.max(this.pollingOffset, update.update_id);
                }
                if (updates.length > 0) {
                    const lastUpdateId = updates[updates.length - 1].update_id;
                    this.pollingOffset = lastUpdateId + 1;
                    this.consecutiveErrors = 0;
                    this.logger.debug(`✅ Updated polling offset to: ${this.pollingOffset} (last update_id: ${lastUpdateId})`);
                }
            }
            else {
                this.logger.debug('📭 No new updates');
            }
            if (this.pollingInterval) {
                setTimeout(() => this.pollUpdates(), 100);
            }
        }
        catch (error) {
            const errorCode = error.response?.status;
            const errorData = error.response?.data;
            if (errorCode === 409) {
                this.consecutiveErrors++;
                this.logger.warn(`⚠️ Conflict (409): Another bot instance may be running. Attempt ${this.consecutiveErrors}`);
                if (this.consecutiveErrors >= 3 && this.consecutiveErrors < 6) {
                    this.logger.warn('⚠️ Multiple 409 errors detected. Attempting to resolve conflict...');
                    try {
                        await this.deleteWebhook(true);
                        this.pollingOffset = 0;
                        this.logger.log('✅ Webhook deleted and offset reset. Retrying polling...');
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        this.consecutiveErrors = 0;
                    }
                    catch (deleteError) {
                        this.logger.error('Failed to delete webhook:', deleteError.message);
                    }
                }
                else if (this.consecutiveErrors >= 6) {
                    this.logger.error('❌ Too many 409 conflicts detected. Stopping polling to prevent infinite loop.');
                    this.logger.error('⚠️ Another bot instance is receiving updates. Please:');
                    this.logger.error('   1. Check if another server/process is using the same bot token');
                    this.logger.error('   2. Stop the other instance or use webhook mode instead');
                    this.logger.error('   3. Restart this service after resolving the conflict');
                    if (this.pollingInterval) {
                        clearInterval(this.pollingInterval);
                        this.pollingInterval = null;
                    }
                    return;
                }
            }
            else {
                this.consecutiveErrors = 0;
                this.logger.error('Failed to poll updates:', errorCode, errorData || error.message);
            }
            if (this.pollingInterval && errorCode !== 409) {
                setTimeout(() => this.pollUpdates(), 5000);
            }
            else if (this.pollingInterval && errorCode === 409 && this.consecutiveErrors < 6) {
                setTimeout(() => this.pollUpdates(), 10000);
            }
            else if (this.pollingInterval && errorCode === 409 && this.consecutiveErrors >= 6) {
                this.logger.error('🛑 Polling stopped due to persistent 409 conflicts. Manual intervention required.');
            }
        }
    }
    async handleMessage(message) {
        const chatId = message.chat.id.toString();
        const text = message.text;
        this.logger.debug(`📨 Received message: "${text}" from ${chatId}, starts with /: ${text?.startsWith('/')}`);
        const maintenanceMode = await this.settingsService.getValue('maintenance_mode', 'false');
        if (maintenanceMode === 'true') {
            await this.sendMessage(chatId, '🛠 Бот находится на техническом обслуживании. Попробуйте позже.');
            return;
        }
        let user = await this.userRepo.findOne({ where: { tg_id: chatId } });
        const isNewUser = !user;
        if (!user) {
            const registrationEnabled = await this.settingsService.getValue('registration_enabled', 'true');
            if (registrationEnabled === 'false') {
                await this.sendMessage(chatId, '🚫 Регистрация новых пользователей временно приостановлена.');
                return;
            }
            let refBy;
            if (text?.startsWith('/start ref')) {
                refBy = text.replace('/start ref', '').trim();
            }
            user = await this.createUser(message.from, refBy);
            await this.sendWelcomeMessage(chatId, user);
            if (refBy && refBy !== chatId) {
                await this.notifyReferrer(refBy);
            }
            return;
        }
        if (await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        const hasPhoto = message.photo && message.photo.length > 0;
        const hasVideo = message.video;
        const hasDocument = message.document;
        const caption = message.caption || '';
        if (hasPhoto || hasVideo || hasDocument) {
            try {
                let fileId;
                let mediaType;
                let fileName;
                if (hasPhoto) {
                    const largestPhoto = message.photo[message.photo.length - 1];
                    fileId = largestPhoto.file_id;
                    mediaType = 'photo';
                }
                else if (hasVideo) {
                    fileId = message.video.file_id;
                    mediaType = 'video';
                    fileName = message.video.file_name;
                }
                else if (hasDocument) {
                    fileId = message.document.file_id;
                    mediaType = 'document';
                    fileName = message.document.file_name;
                }
                else {
                    return;
                }
                const fileUrl = await this.getFileUrl(fileId);
                await this.messagesService.createUserMessage(user.id, caption, fileUrl, mediaType);
                this.logger.log(`Saved ${mediaType} from user ${chatId} (file: ${fileUrl})`);
                return;
            }
            catch (error) {
                this.logger.error(`Failed to save media from user ${chatId}:`, error);
                return;
            }
        }
        if (text?.startsWith('/')) {
            const isBlocked = await this.checkUserBlocked(user);
            if (isBlocked) {
                this.logger.warn(`BLOCKED user ${user.tg_id} (ID: ${user.id}) attempted command: ${text}`);
                await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                    'Ваш аккаунт был заблокирован администратором.\n\n' +
                    'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                    '_Доступ к боту временно ограничен._');
                return;
            }
            if (await this.checkUserBlocked(user)) {
                this.logger.warn(`BLOCKED user ${user.tg_id} (ID: ${user.id}) attempted command: ${text} (double-check)`);
                await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                    'Ваш аккаунт был заблокирован администратором.\n\n' +
                    'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                    '_Доступ к боту временно ограничен._');
                return;
            }
            await this.handleCommand(chatId, text, user);
        }
        else if (text?.startsWith('wallet ')) {
            const { allSubscribed, unsubscribedChannels } = await this.checkMandatoryChannels(user.tg_id);
            if (!allSubscribed) {
                await this.sendMessage(chatId, `🔔 *Обязательная подписка*\n\n` +
                    `Для использования бота необходимо подписаться на наши каналы:\n\n` +
                    unsubscribedChannels.map((ch, i) => `${i + 1}️⃣ ${ch.title}`).join('\n') +
                    `\n\n_После подписки нажмите кнопку "Я подписался"_`, this.generateSubscriptionKeyboard(unsubscribedChannels, 'check_subscription'));
                return;
            }
            await this.handleWithdrawalRequest(chatId, user, text);
        }
        else {
            if (await this.checkUserBlocked(user)) {
                await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                    'Ваш аккаунт был заблокирован администратором.\n\n' +
                    'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                    '_Доступ к боту временно ограничен._');
                return;
            }
            const handled = await this.handleReplyButton(chatId, text, user);
            if (handled) {
                return;
            }
            const { allSubscribed, unsubscribedChannels } = await this.checkMandatoryChannels(user.tg_id);
            if (!allSubscribed) {
                await this.sendMessage(chatId, `🔔 *Обязательная подписка*\n\n` +
                    `Для использования бота необходимо подписаться на наши каналы:\n\n` +
                    unsubscribedChannels.map((ch, i) => `${i + 1}️⃣ ${ch.title}`).join('\n') +
                    `\n\n_После подписки нажмите кнопку "Я подписался"_`, this.generateSubscriptionKeyboard(unsubscribedChannels, 'check_subscription'));
                return;
            }
            const scenario = await this.findMatchingScenario(text);
            if (scenario) {
                await this.handleScenario(chatId, user, scenario);
            }
            else {
                await this.messagesService.createUserMessage(user.id, text);
                await this.sendMessage(chatId, 'Спасибо за ваше сообщение! Администратор скоро ответит.', await this.getReplyKeyboard(user.tg_id));
            }
        }
    }
    async createUser(from, refBy) {
        let referrerId;
        if (refBy) {
            const referrer = await this.userRepo.findOne({ where: { tg_id: refBy } });
            if (referrer) {
                referrerId = referrer.id;
            }
        }
        const user = this.userRepo.create({
            tg_id: from.id.toString(),
            username: from.username,
            first_name: from.first_name,
            last_name: from.last_name,
            referred_by: referrerId || undefined,
            status: 'active',
            balance_usdt: 0,
        });
        const savedUser = await this.userRepo.save(user);
        if (refBy) {
            await this.giveReferralBonus(refBy);
        }
        return savedUser;
    }
    async giveReferralBonus(referrerTgId) {
        try {
            const referrer = await this.userRepo.findOne({ where: { tg_id: referrerTgId } });
            if (referrer) {
                const refBonusPercent = await this.settingsService.getValue('ref_bonus_percent', '5.00');
                const bonusAmount = parseFloat(refBonusPercent);
                const balanceBefore = parseFloat(referrer.balance_usdt.toString());
                const balanceAfter = balanceBefore + bonusAmount;
                referrer.balance_usdt = balanceAfter;
                await this.userRepo.save(referrer);
                await this.balanceLogRepo.save({
                    user_id: referrer.id,
                    delta: bonusAmount,
                    balance_before: balanceBefore,
                    balance_after: balanceAfter,
                    reason: 'referral_bonus',
                    comment: 'Бонус за приглашение реферала',
                });
                this.logger.log(`Referral bonus ${bonusAmount} USDT given to user ${referrerTgId}`);
                this.sendBalanceChangeNotification(referrerTgId, balanceBefore, balanceAfter, bonusAmount, 'referral_bonus', 'Бонус за приглашение реферала').catch(error => {
                    this.logger.error(`Failed to send referral bonus notification:`, error.message);
                });
                this.fakeStatsService.regenerateFakeStats().catch(error => {
                    this.logger.error(`Failed to update fake stats after referral bonus:`, error.message);
                });
            }
        }
        catch (error) {
            this.logger.error('Error giving referral bonus:', error);
        }
    }
    async checkUserBlocked(user) {
        try {
            const freshUser = await this.userRepo.findOne({ where: { id: user.id } });
            if (freshUser) {
                Object.assign(user, freshUser);
                const isBlocked = freshUser.status === 'blocked';
                if (isBlocked) {
                    this.logger.log(`User ${user.tg_id} (ID: ${user.id}) is BLOCKED`);
                }
                return isBlocked;
            }
            const isBlocked = user.status === 'blocked';
            if (isBlocked) {
                this.logger.log(`User ${user.tg_id} (ID: ${user.id}) is BLOCKED (no fresh data)`);
            }
            return isBlocked;
        }
        catch (error) {
            this.logger.error(`Error checking user blocked status:`, error);
            return user.status === 'blocked';
        }
    }
    async notifyReferrer(referrerTgId) {
        try {
            await this.sendMessage(referrerTgId, '🎉 У вас новый реферал! Вы получили бонус 5 USDT.');
        }
        catch (error) {
            this.logger.error('Error notifying referrer:', error);
        }
    }
    async sendWelcomeMessage(chatId, user) {
        if (await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        const startCommand = await this.commandsService.findByName('start');
        if (startCommand) {
            await this.handleCustomCommand(chatId, user, startCommand);
            return;
        }
        const fakeStats = await this.fakeStatsService.getLatestFakeStats();
        const greetingTemplate = await this.settingsService.getValue('greeting_template', '👋 Добро пожаловать, {username}!\n\n💰 Ваш баланс: {balance} USDT\n📊 Всего заработано: {tasks_completed} заданий\n\n🎯 Выполняйте задания и зарабатывайте!\n👥 Приглашайте друзей по реферальной ссылке\n💸 Выводите заработанные средства\n\n📈 Сейчас онлайн: {fake.online} чел.\n✅ Активных пользователей: {fake.active}\n💵 Выплачено всего: ${fake.paid} USDT');
        let text = greetingTemplate;
        if (fakeStats) {
            text = text
                .replace(/{fake\.online}/g, fakeStats.online.toString())
                .replace(/{fake\.active}/g, fakeStats.active.toString())
                .replace(/{fake\.paid}/g, fakeStats.paid_usdt.toString())
                .replace(/{username}/g, user.username || user.first_name || 'Друг')
                .replace(/{balance}/g, user.balance_usdt.toString())
                .replace(/{tasks_completed}/g, user.tasks_completed.toString())
                .replace(/{first_name}/g, user.first_name || 'Друг')
                .replace(/{chat_id}/g, chatId);
        }
        else {
            text = text
                .replace(/{fake\.online}/g, '0')
                .replace(/{fake\.active}/g, '0')
                .replace(/{fake\.paid}/g, '0')
                .replace(/{username}/g, user.username || user.first_name || 'Друг')
                .replace(/{balance}/g, user.balance_usdt.toString())
                .replace(/{tasks_completed}/g, user.tasks_completed.toString())
                .replace(/{first_name}/g, user.first_name || 'Друг')
                .replace(/{chat_id}/g, chatId);
        }
        await this.sendMessage(chatId, text, await this.getReplyKeyboard(user?.tg_id));
    }
    async handleCommand(chatId, command, user) {
        const isBlocked = await this.checkUserBlocked(user);
        if (isBlocked) {
            this.logger.warn(`BLOCKED user ${user.tg_id} (ID: ${user.id}) attempted command: ${command}`);
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        let cmd = command.split(' ')[0];
        const cmdName = cmd.startsWith('/') ? cmd.substring(1) : cmd;
        if (await this.checkUserBlocked(user)) {
            this.logger.warn(`BLOCKED user ${user.tg_id} (ID: ${user.id}) attempted command: ${command} (double-check)`);
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        if (await this.checkUserBlocked(user)) {
            this.logger.warn(`BLOCKED user ${user.tg_id} (ID: ${user.id}) attempted command: ${command} (triple-check before switch)`);
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        const { allSubscribed, unsubscribedChannels } = await this.checkMandatoryChannels(user.tg_id);
        if (!allSubscribed) {
            await this.sendMessage(chatId, `🔔 *Обязательная подписка*\n\n` +
                `Добро пожаловать! Для использования бота необходимо подписаться на наши каналы:\n\n` +
                unsubscribedChannels.map((ch, i) => `${i + 1}️⃣ ${ch.title}`).join('\n') +
                `\n\n_После подписки нажмите кнопку "Я подписался"_`, this.generateSubscriptionKeyboard(unsubscribedChannels, 'check_subscription'));
            return;
        }
        if (await this.checkUserBlocked(user)) {
            this.logger.warn(`BLOCKED user ${user.tg_id} (ID: ${user.id}) attempted command: ${command} (final check before switch)`);
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        const dbCommand = await this.commandsService.findByName(cmdName);
        if (dbCommand) {
            await this.handleCustomCommand(chatId, user, dbCommand);
            return;
        }
        const task = await this.taskRepo.findOne({
            where: {
                command: cmd,
                active: true
            }
        });
        if (task) {
            await this.handleTaskCommand(chatId, user, task);
            return;
        }
        if (cmdName === 'start') {
            await this.sendWelcomeMessage(chatId, user);
            return;
        }
        await this.sendMessage(chatId, '❓ Неизвестная команда.\n\nИспользуйте /start для просмотра доступных функций.', await this.getReplyKeyboard(user?.tg_id));
    }
    async handleTaskCommand(chatId, user, task) {
        try {
            if (task.cooldown_hours > 0) {
                const lastCompletion = await this.userTaskRepo.findOne({
                    where: { user_id: user.id, task_id: task.id },
                    order: { created_at: 'DESC' },
                });
                if (lastCompletion) {
                    const hoursSinceCompletion = (Date.now() - new Date(lastCompletion.created_at).getTime()) / (1000 * 60 * 60);
                    if (hoursSinceCompletion < task.cooldown_hours) {
                        const remainingHours = Math.ceil(task.cooldown_hours - hoursSinceCompletion);
                        await this.sendMessage(chatId, `⏳ Это задание можно выполнить повторно через ${remainingHours} ${remainingHours === 1 ? 'час' : 'часов'}.`, await this.getReplyKeyboard(user?.tg_id));
                        return;
                    }
                }
            }
            const completedCount = await this.userTaskRepo.count({
                where: { user_id: user.id, task_id: task.id },
            });
            if (completedCount >= task.max_per_user) {
                await this.sendMessage(chatId, '✅ Вы уже выполнили это задание максимальное количество раз.', await this.getReplyKeyboard(user?.tg_id));
                return;
            }
            const reward_min = parseFloat(task.reward_min.toString());
            const reward_max = parseFloat(task.reward_max.toString());
            const calculatedReward = parseFloat((reward_min + Math.random() * (reward_max - reward_min)).toFixed(2));
            const userTask = this.userTaskRepo.create({
                user_id: user.id,
                task_id: task.id,
                status: task.task_type === 'manual' ? 'pending' : 'completed',
                reward: calculatedReward,
                reward_received: task.task_type === 'manual' ? 0 : calculatedReward,
            });
            this.logger.log(`💰 Assigned reward for task "${task.title}": ${calculatedReward} USDT (range: ${reward_min}-${reward_max})`);
            await this.userTaskRepo.save(userTask);
            if (task.task_type !== 'manual') {
                await this.usersService.updateBalance(user.tg_id, userTask.reward, `Выполнение задания: ${task.title}`);
                await this.userRepo.update(user.id, {
                    tasks_completed: user.tasks_completed + 1,
                    total_earned: user.total_earned + userTask.reward,
                });
                const updatedUser = await this.userRepo.findOne({ where: { id: user.id } });
                if (updatedUser) {
                    await this.sendMessage(chatId, `✅ *Задание выполнено успешно!*\n\n` +
                        `📋 ${task.title}\n` +
                        `💰 Награда: *${calculatedReward.toFixed(2)} USDT*\n\n` +
                        `━━━━━━━━━━━━━━━━\n` +
                        `💳 Текущий баланс: *${updatedUser.balance_usdt.toFixed(2)} USDT*\n` +
                        `✨ Выполнено заданий: ${updatedUser.tasks_completed}\n` +
                        `📈 Всего заработано: ${updatedUser.total_earned.toFixed(2)} USDT\n\n` +
                        `Поздравляем! Средства зачислены на ваш счет. 🎉`, await this.getReplyKeyboard(user?.tg_id));
                }
            }
            else {
                await this.sendMessage(chatId, `📝 *Задание отправлено на проверку*\n\n` +
                    `📋 ${task.title}\n` +
                    `💰 Потенциальная награда: *${calculatedReward.toFixed(2)} USDT*\n\n` +
                    `⏳ Ожидайте подтверждения администратора.\n` +
                    `Мы проверим выполнение в ближайшее время и отправим вам уведомление.\n\n` +
                    `📬 Вы получите сообщение о результатах проверки.`, await this.getReplyKeyboard(user?.tg_id));
            }
        }
        catch (error) {
            this.logger.error(`Error handling task command:`, error);
            await this.sendMessage(chatId, 'Произошла ошибка при выполнении задания. Попробуйте позже.', await this.getReplyKeyboard());
        }
    }
    async sendHelp(chatId, user, customResponse) {
        if (user && await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        const text = customResponse ||
            `📖 *Справка по боту*\n\n` +
                `🎯 *Используйте кнопки меню:*\n` +
                `📋 Задания - список доступных заданий\n` +
                `💰 Баланс - проверить баланс и заработок\n` +
                `👤 Профиль - ваша статистика\n` +
                `👥 Рефералы - пригласить друзей\n` +
                `💸 Вывести - вывод средств\n\n` +
                `💡 *Команды:*\n` +
                `/start - главное меню\n` +
                `/help - эта справка\n\n` +
                `❓ Есть вопросы? Напишите нам, и мы ответим!`;
        await this.sendMessage(chatId, text, await this.getReplyKeyboard());
    }
    async sendAvailableTasks(chatId, user, customResponse) {
        if (await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        const tasks = await this.taskRepo.find({ where: { active: true } });
        if (tasks.length === 0) {
            await this.sendMessage(chatId, 'На данный момент нет доступных заданий.', {
                inline_keyboard: [[{ text: '🔙 Главное меню', callback_data: 'menu' }]],
            });
            return;
        }
        const userRank = await this.ranksService.getUserRank(user.id);
        const userRankLevel = userRank.current_rank;
        const hasPlatinum = userRank.platinum_active && userRank.platinum_expires_at && new Date() < userRank.platinum_expires_at;
        const completedTotal = await this.userTaskRepo.count({
            where: { user_id: user.id, status: 'completed' },
        });
        let message = customResponse ||
            `📋 *Доступные задания*\n\n` +
                `✅ Выполнено: ${completedTotal} заданий\n` +
                `💰 Заработано: ${user.total_earned} USDT\n\n` +
                `Выберите задание:`;
        const keyboard = [];
        for (const task of tasks) {
            let isAvailableForUser = true;
            if (task.available_for === 'platinum') {
                isAvailableForUser = hasPlatinum;
            }
            else if (task.available_for === 'ranks' && task.target_ranks) {
                try {
                    const targetRanks = JSON.parse(task.target_ranks);
                    if (Array.isArray(targetRanks)) {
                        isAvailableForUser = hasPlatinum || targetRanks.includes(userRankLevel);
                    }
                }
                catch (e) {
                    this.logger.warn(`Failed to parse target_ranks for task ${task.id}: ${e.message}`);
                    isAvailableForUser = true;
                }
            }
            if (!isAvailableForUser) {
                continue;
            }
            const completedCount = await this.userTaskRepo.count({
                where: { user_id: user.id, task_id: task.id, status: 'completed' },
            });
            const canDo = completedCount < task.max_per_user;
            if (canDo) {
                const inProgress = await this.userTaskRepo.findOne({
                    where: { user_id: user.id, task_id: task.id, status: 'in_progress' },
                });
                const submitted = await this.userTaskRepo.findOne({
                    where: { user_id: user.id, task_id: task.id, status: 'submitted' },
                });
                let badge = '🆕';
                if (submitted) {
                    badge = '⏳';
                }
                else if (inProgress) {
                    badge = '▶️';
                }
                else if (completedCount > 0 && completedCount < task.max_per_user) {
                    badge = '🔄';
                }
                const progress = task.max_per_user > 1 ? ` (${completedCount}/${task.max_per_user})` : '';
                keyboard.push([{
                        text: `${badge} ${task.title} ${progress}`,
                        callback_data: `task_${task.id}`,
                    }]);
            }
        }
        keyboard.push([
            { text: '📚 Мои задания', callback_data: 'my_tasks' },
            { text: '🔙 Главное меню', callback_data: 'menu' },
        ]);
        await this.sendMessage(chatId, message, { inline_keyboard: keyboard });
    }
    async handleCallbackQuery(callback) {
        const chatId = callback.message.chat.id.toString();
        const data = callback.data;
        const tgId = callback.from.id.toString();
        const user = await this.userRepo.findOne({ where: { tg_id: tgId } });
        if (!user) {
            await this.answerCallbackQuery(callback.id, 'Пользователь не найден');
            await this.sendMessage(chatId, 'Пользователь не найден. Используйте /start');
            return;
        }
        if (await this.checkUserBlocked(user)) {
            await this.answerCallbackQuery(callback.id, 'Ваш аккаунт заблокирован');
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        await this.answerCallbackQuery(callback.id, '⏳ Обработка...');
        if (data !== 'check_subscription' && data !== 'noop' && data !== 'menu') {
            const { allSubscribed, unsubscribedChannels } = await this.checkMandatoryChannels(tgId);
            if (!allSubscribed) {
                await this.sendMessage(chatId, `🔔 *Обязательная подписка*\n\n` +
                    `Для использования бота необходимо подписаться на наши каналы:\n\n` +
                    unsubscribedChannels.map((ch, i) => `${i + 1}️⃣ ${ch.title}`).join('\n') +
                    `\n\n_После подписки нажмите кнопку "Я подписался"_`, this.generateSubscriptionKeyboard(unsubscribedChannels, data));
                return;
            }
        }
        if (data === 'check_subscription') {
            const { allSubscribed, unsubscribedChannels } = await this.checkMandatoryChannels(tgId);
            if (!allSubscribed) {
                await this.answerCallbackQuery(callback.id, '❌ Вы не подписаны на все каналы');
                await this.sendMessage(chatId, `❌ *Вы еще не подписались на все каналы!*\n\n` +
                    `Осталось подписаться на:\n` +
                    unsubscribedChannels.map((ch, i) => `${i + 1}️⃣ ${ch.title}`).join('\n'), this.generateSubscriptionKeyboard(unsubscribedChannels, 'check_subscription'));
            }
            else {
                await this.ranksService.setChannelsSubscribed(user.id, true);
                const rankUpdate = await this.ranksService.checkAndUpdateRank(user.id);
                await this.answerCallbackQuery(callback.id, '✅ Подписка подтверждена!');
                let message = '✅ Отлично! Все подписки подтверждены!';
                if (rankUpdate.leveledUp && rankUpdate.newLevel === 'bronze') {
                    message = `🎉 *Поздравляем!*\n\n` +
                        `🥉 Ты достиг ранга *Бронза*!\n\n` +
                        `💰 Новый бонус: *+${rankUpdate.rank.bonus_percentage}%* ко всем наградам!\n\n` +
                        `Теперь ты можешь выполнять задания и зарабатывать больше!`;
                }
                await this.sendMessage(chatId, message, await this.getReplyKeyboard(user?.tg_id));
            }
            return;
        }
        else if (data === 'my_tasks') {
            await this.showMyTasks(chatId, user);
        }
        else if (data.startsWith('task_')) {
            await this.handleTaskAction(chatId, user, data);
        }
        else if (data.startsWith('start_task_')) {
            await this.startTask(chatId, user, data);
        }
        else if (data.startsWith('submit_task_')) {
            await this.submitTask(chatId, user, data);
        }
        else if (data.startsWith('cancel_task_')) {
            await this.cancelTask(chatId, user, data);
        }
        else if (data.startsWith('verify_')) {
            await this.handleTaskVerification(chatId, user, data);
        }
        else if (data === 'noop') {
            return;
        }
        else if (data === 'menu') {
            await this.sendWelcomeMessage(chatId, user);
        }
        else {
            const button = await this.buttonRepo.findOne({ where: { id: data } });
            if (button) {
                await this.handleCustomButton(chatId, user, button);
            }
        }
    }
    async getMainKeyboard() {
        const cacheKey = 'buttons:main_keyboard';
        const cached = this.syncService.getCache(cacheKey);
        if (cached) {
            this.logger.debug('✅ Using cached main keyboard');
            return cached;
        }
        const buttons = await this.buttonRepo.find({
            where: { active: true },
            order: { row: 'ASC', col: 'ASC' },
        });
        const keyboard = [];
        const rows = {};
        for (const button of buttons) {
            if (!rows[button.row]) {
                rows[button.row] = [];
            }
            rows[button.row].push({
                text: button.label,
                callback_data: button.id,
            });
        }
        for (const rowKey in rows) {
            keyboard.push(rows[rowKey]);
        }
        if (keyboard.length === 0) {
            this.logger.warn('⚠️ No inline keyboard buttons configured in database. Please add buttons via admin panel.');
        }
        const result = {
            inline_keyboard: keyboard,
        };
        this.syncService.setCache(cacheKey, result, 60);
        return result;
    }
    async getReplyKeyboard(userTgId) {
        const isAdmin = userTgId ? await this.isUserAdmin(userTgId) : false;
        const cacheKey = `buttons:reply_keyboard:${isAdmin ? 'admin' : 'user'}`;
        const cached = this.syncService.getCache(cacheKey);
        if (cached) {
            this.logger.debug('✅ Using cached reply keyboard');
            return cached;
        }
        const whereCondition = { active: true };
        if (!isAdmin) {
            whereCondition.admin_only = false;
        }
        const dbButtons = await this.buttonRepo.find({
            where: whereCondition,
            order: { row: 'ASC', col: 'ASC' },
        });
        const keyboard = [];
        const rows = {};
        for (const button of dbButtons) {
            if (!rows[button.row]) {
                rows[button.row] = [];
            }
            rows[button.row].push({
                text: button.label,
            });
        }
        for (const rowKey of Object.keys(rows).sort((a, b) => parseInt(a) - parseInt(b))) {
            keyboard.push(rows[rowKey]);
        }
        if (keyboard.length === 0) {
            this.logger.warn('⚠️ No reply keyboard buttons configured in database. Please add buttons via admin panel.');
        }
        const result = {
            keyboard,
            resize_keyboard: true,
            persistent: true,
        };
        this.syncService.setCache(cacheKey, result, 60);
        return result;
    }
    async isUserAdmin(tgId) {
        try {
            const admin = await this.adminRepo.findOne({ where: { tg_id: tgId } });
            return !!admin;
        }
        catch (error) {
            this.logger.error(`Error checking admin status for ${tgId}:`, error.message);
            return false;
        }
    }
    async handleReplyButton(chatId, text, user) {
        this.logger.debug(`🔘 Handling reply button: "${text}" from user ${user.tg_id}`);
        if (await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return true;
        }
        const button = await this.buttonRepo.findOne({
            where: { label: text, active: true }
        });
        if (button) {
            this.logger.debug(`✅ Found button in DB: ${button.label}, command: ${button.command || 'none'}`);
            if (button.command) {
                this.logger.debug(`📝 Button has command, calling handleCommand: ${button.command}`);
                await this.handleCommand(chatId, button.command, user);
                return true;
            }
            this.logger.debug(`🎯 Button has no command, calling handleCustomButton`);
            await this.handleCustomButton(chatId, user, button);
            return true;
        }
        const normalizedText = text.trim().toLowerCase();
        this.logger.debug(`🔍 Button not found in DB, checking fallback for: "${normalizedText}"`);
        const zadaniyaVariants = ['задания', 'задани', 'заданий', 'заданиe'];
        const matchesZadaniya = zadaniyaVariants.some(variant => normalizedText === variant ||
            normalizedText.includes(variant) ||
            text.toLowerCase().includes(variant));
        if (matchesZadaniya || normalizedText === 'задания' || normalizedText.includes('задания')) {
            this.logger.log(`✅ Fallback: Handling "Задания" button (normalized: "${normalizedText}", original: "${text}")`);
            await this.sendAvailableTasks(chatId, user);
            return true;
        }
        if (normalizedText === 'профиль' || normalizedText.includes('профиль')) {
            this.logger.debug(`✅ Fallback: Handling "Профиль" button`);
            await this.handleCommand(chatId, '/profile', user);
            return true;
        }
        if (normalizedText === 'баланс' || normalizedText.includes('баланс')) {
            this.logger.debug(`✅ Fallback: Handling "Баланс" button`);
            await this.handleCommand(chatId, '/balance', user);
            return true;
        }
        if (normalizedText === 'рефералы' || normalizedText.includes('рефералы')) {
            this.logger.debug(`✅ Fallback: Handling "Рефералы" button`);
            await this.handleCommand(chatId, '/referrals', user);
            return true;
        }
        this.logger.debug(`❌ Button not handled: "${text}"`);
        return false;
    }
    async sendMessage(chatId, text, replyMarkup) {
        const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
        try {
            this.logger.debug(`📤 Sending message to ${chatId}, text length: ${text?.length || 0}`);
            const response = await axios_1.default.post(url, {
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
                reply_markup: replyMarkup,
            });
            this.logger.debug(`✅ Message sent successfully to ${chatId}`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`❌ Failed to send message to ${chatId}:`, error.message);
            if (error.response?.data) {
                this.logger.error(`Telegram API error:`, JSON.stringify(error.response.data));
            }
            throw error;
        }
    }
    async getFileUrl(fileId) {
        try {
            const getFileUrl = `https://api.telegram.org/bot${this.botToken}/getFile`;
            const response = await axios_1.default.post(getFileUrl, {
                file_id: fileId,
            });
            const filePath = response.data.result.file_path;
            const fileUrl = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
            return fileUrl;
        }
        catch (error) {
            this.logger.error(`Failed to get file URL for file_id ${fileId}:`, error);
            throw error;
        }
    }
    async sendMessageWithMedia(chatId, text, mediaUrl, mediaType) {
        try {
            if (!mediaType) {
                if (mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                    mediaType = 'photo';
                }
                else if (mediaUrl.match(/\.(mp4|webm|ogg)$/i)) {
                    mediaType = 'video';
                }
                else {
                    mediaType = 'document';
                }
            }
            let method;
            let mediaField;
            switch (mediaType) {
                case 'photo':
                    method = 'sendPhoto';
                    mediaField = 'photo';
                    break;
                case 'video':
                    method = 'sendVideo';
                    mediaField = 'video';
                    break;
                default:
                    method = 'sendDocument';
                    mediaField = 'document';
                    break;
            }
            const url = `https://api.telegram.org/bot${this.botToken}/${method}`;
            await axios_1.default.post(url, {
                chat_id: chatId,
                [mediaField]: mediaUrl,
                caption: text || undefined,
                parse_mode: text ? 'HTML' : undefined,
            });
            this.logger.log(`✅ Sent ${mediaType} message to ${chatId}`);
        }
        catch (error) {
            this.logger.error(`❌ Failed to send media message to ${chatId}:`, {
                error: error.response?.data || error.message,
                mediaUrl,
                mediaType,
                status: error.response?.status,
            });
        }
    }
    async sendBalanceChangeNotification(chatId, balanceBefore, balanceAfter, delta, reason, comment) {
        try {
            this.logger.log(`Sending balance notification to ${chatId}: delta=${delta}, reason=${reason}`);
            const isAddition = delta > 0;
            const emoji = isAddition ? '💰' : '💸';
            const operationType = isAddition ? 'Пополнение' : 'Списание';
            const amountStr = isAddition ? `+${delta.toFixed(2)}` : delta.toFixed(2);
            let reasonText = comment || 'Причина не указана';
            const reasonTranslations = {
                'manual_adjustment': 'Ручная корректировка администратором',
                'admin_add': 'Пополнение администратором',
                'admin_deduct': 'Списание администратором',
                'task_reward': 'Награда за выполнение задания',
                'referral_bonus': 'Реферальный бонус',
                'payout_request': 'Заявка на вывод средств',
                'payout_rejected': 'Отклонение заявки на вывод',
                'payout_completed': 'Завершение вывода средств',
            };
            if (!comment && reasonTranslations[reason]) {
                reasonText = reasonTranslations[reason];
            }
            else if (!comment) {
                reasonText = reason;
            }
            const currentDate = new Date().toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
            const message = `${emoji} *${operationType} баланса*\n\n` +
                `💵 Сумма: *${amountStr} USDT*\n` +
                `📊 Было: ${balanceBefore.toFixed(2)} USDT\n` +
                `📈 Стало: *${balanceAfter.toFixed(2)} USDT*\n\n` +
                `📝 Причина: _${reasonText}_\n` +
                `📅 Дата: ${currentDate}`;
            await this.sendMessage(chatId, message);
            this.logger.log(`✅ Balance notification sent successfully to ${chatId}`);
        }
        catch (error) {
            if (error.response?.data?.error_code === 403) {
                this.logger.warn(`User ${chatId} has blocked the bot - notification not sent`);
            }
            else if (error.response?.data?.description?.includes('chat not found')) {
                this.logger.warn(`Chat ${chatId} not found - notification not sent`);
            }
            else {
                this.logger.error(`Failed to send balance notification to ${chatId}:`, error.message);
                if (error.response?.data) {
                    this.logger.error('Telegram API error:', JSON.stringify(error.response.data));
                }
            }
        }
    }
    async answerCallbackQuery(callbackQueryId, text) {
        const url = `https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`;
        try {
            await axios_1.default.post(url, {
                callback_query_id: callbackQueryId,
                text,
            });
        }
        catch (error) {
            this.logger.error('Failed to answer callback query:', error.message);
        }
    }
    async setWebhook(webhookUrl) {
        const url = `https://api.telegram.org/bot${this.botToken}/setWebhook`;
        try {
            const response = await axios_1.default.post(url, {
                url: webhookUrl,
            });
            this.logger.log(`Webhook set to: ${webhookUrl}`);
            return response.data;
        }
        catch (error) {
            this.logger.error('Failed to set webhook:', error);
            throw error;
        }
    }
    async deleteWebhook(dropPendingUpdates = true) {
        const url = `https://api.telegram.org/bot${this.botToken}/deleteWebhook`;
        try {
            const response = await axios_1.default.post(url, {
                drop_pending_updates: dropPendingUpdates,
            });
            this.logger.log('Webhook deleted successfully');
            return response.data;
        }
        catch (error) {
            this.logger.error('Failed to delete webhook:', error);
            throw error;
        }
    }
    async sendBalance(chatId, user, customResponse) {
        if (await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        const text = customResponse ||
            `💰 *Ваш баланс*\n\n` +
                `💵 Доступно: *${user.balance_usdt} USDT*\n` +
                `📊 Всего заработано: ${user.total_earned} USDT\n` +
                `✅ Выполнено заданий: ${user.tasks_completed}\n\n` +
                `💸 Для вывода используйте кнопку "*Вывести*" внизу\n` +
                `📋 Выполняйте задания чтобы заработать больше!`;
        await this.sendMessage(chatId, text, await this.getReplyKeyboard());
    }
    async sendProfile(chatId, user, customResponse) {
        if (await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        const refCount = await this.userRepo.count({
            where: { referred_by: user.id },
        });
        const text = customResponse ||
            `*Профиль*\n\n` +
                `💰 Баланс: *${user.balance_usdt} USDT*\n` +
                `📊 Заработано: ${user.total_earned} USDT\n` +
                `✅ Заданий: ${user.tasks_completed}\n` +
                `👥 Рефералов: ${refCount}`;
        await this.sendMessage(chatId, text, await this.getReplyKeyboard());
    }
    async sendWithdrawInfo(chatId, user, customResponse) {
        if (await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        const minWithdraw = await this.settingsService.getValue('min_withdraw_usdt', '10.00');
        if (parseFloat(user.balance_usdt.toString()) < parseFloat(minWithdraw)) {
            await this.sendMessage(chatId, `❌ *Недостаточно средств для вывода*\n\n` +
                `Минимальная сумма: ${minWithdraw} USDT\n` +
                `Ваш баланс: ${user.balance_usdt} USDT\n\n` +
                `📋 Выполните больше заданий чтобы заработать!`, await this.getReplyKeyboard(user?.tg_id));
            return;
        }
        const text = customResponse ||
            `💸 *Вывод средств*\n\n` +
                `💰 Ваш баланс: *${user.balance_usdt} USDT*\n` +
                `📊 Минимум для вывода: ${minWithdraw} USDT\n\n` +
                `📝 *Инструкция:*\n` +
                `Отправьте сообщение в формате:\n` +
                `\`wallet АДРЕС СУММА\`\n\n` +
                `📌 *Пример:*\n` +
                `\`wallet TXxxx...xxx 50\`\n\n` +
                `⚠️ Используйте только TRC20 (USDT Tron)`;
        await this.sendMessage(chatId, text, await this.getReplyKeyboard());
    }
    async sendReferralInfo(chatId, user, customResponse) {
        if (await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        const refCount = await this.userRepo.count({
            where: { referred_by: user.id },
        });
        const refBonusPercent = await this.settingsService.getValue('ref_bonus_percent', '5.00');
        const botUsername = await this.settingsService.getValue('bot_username', 'yourbot');
        const refLink = `https://t.me/${botUsername}?start=ref${user.tg_id}`;
        const text = customResponse ||
            `👥 *Реферальная программа*\n\n` +
                `💰 Получайте *${refBonusPercent} USDT* за каждого друга!\n` +
                `🎁 Ваш друг также получит бонус при регистрации\n\n` +
                `📊 *Ваша статистика:*\n` +
                `👥 Приглашено: *${refCount} чел.*\n` +
                `💵 Заработано с рефералов: ${(refCount * parseFloat(refBonusPercent)).toFixed(2)} USDT\n\n` +
                `🔗 *Ваша реферальная ссылка:*\n` +
                `\`${refLink}\`\n\n` +
                `📤 Скопируйте ссылку и делитесь с друзьями!\n` +
                `💡 Чем больше друзей - тем больше заработок!`;
        await this.sendMessage(chatId, text, await this.getReplyKeyboard());
    }
    async handleTaskAction(chatId, user, data) {
        if (await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        const taskId = data.replace('task_', '');
        const task = await this.taskRepo.findOne({ where: { id: taskId } });
        if (!task || !task.active) {
            await this.sendMessage(chatId, '❌ Задание недоступно', {
                inline_keyboard: [[{ text: '🔙 К заданиям', callback_data: 'tasks' }]],
            });
            return;
        }
        const userRank = await this.ranksService.getUserRank(user.id);
        const userRankLevel = userRank.current_rank;
        const hasPlatinum = userRank.platinum_active && userRank.platinum_expires_at && new Date() < userRank.platinum_expires_at;
        let isAvailableForUser = true;
        if (task.available_for === 'platinum') {
            isAvailableForUser = hasPlatinum;
        }
        else if (task.available_for === 'ranks' && task.target_ranks) {
            try {
                const targetRanks = JSON.parse(task.target_ranks);
                if (Array.isArray(targetRanks)) {
                    isAvailableForUser = hasPlatinum || targetRanks.includes(userRankLevel);
                }
            }
            catch (e) {
                this.logger.warn(`Failed to parse target_ranks for task ${task.id}: ${e.message}`);
                isAvailableForUser = true;
            }
        }
        if (!isAvailableForUser) {
            await this.sendMessage(chatId, '❌ Задание недоступно для вашего ранга/подписки', {
                inline_keyboard: [[{ text: '🔙 К заданиям', callback_data: 'tasks' }]],
            });
            return;
        }
        const completedCount = await this.userTaskRepo.count({
            where: { user_id: user.id, task_id: task.id, status: 'completed' },
        });
        if (completedCount >= task.max_per_user) {
            await this.sendMessage(chatId, '✅ Вы уже выполнили это задание максимальное количество раз', {
                inline_keyboard: [[{ text: '🔙 К заданиям', callback_data: 'tasks' }]],
            });
            return;
        }
        const existingTask = await this.userTaskRepo.findOne({
            where: { user_id: user.id, task_id: task.id, status: 'in_progress' },
        });
        const submittedTask = await this.userTaskRepo.findOne({
            where: { user_id: user.id, task_id: task.id, status: 'submitted' },
        });
        let text = `📋 *${task.title}*\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
        text += `📝 *Описание:*\n${task.description}\n\n`;
        text += `💰 *Награда:* ${task.reward_min}`;
        if (task.reward_max > task.reward_min) {
            text += `-${task.reward_max}`;
        }
        text += ` USDT\n\n`;
        text += `📊 *Прогресс:* ${completedCount}/${task.max_per_user} выполнено\n\n`;
        if (task.action_url) {
            text += `🔗 *Ссылка:* ${task.action_url}\n\n`;
        }
        if (submittedTask) {
            text += `⏳ *Статус:* Ожидает проверки администратором\n`;
        }
        else if (existingTask) {
            text += `▶️ *Статус:* Задание в процессе выполнения\n`;
        }
        else {
            text += `🆕 *Статус:* Готово к выполнению\n`;
        }
        const keyboard = [];
        if (submittedTask) {
            keyboard.push([{ text: '⏳ Ожидает проверки...', callback_data: 'noop' }]);
        }
        else if (existingTask) {
            keyboard.push([{ text: '✅ Я выполнил задание', callback_data: `submit_task_${task.id}` }]);
            keyboard.push([{ text: '❌ Отменить', callback_data: `cancel_task_${task.id}` }]);
        }
        else {
            keyboard.push([{ text: '▶️ Начать задание', callback_data: `start_task_${task.id}` }]);
        }
        keyboard.push([{ text: '🔙 К заданиям', callback_data: 'tasks' }]);
        await this.sendMessage(chatId, text, { inline_keyboard: keyboard });
    }
    async startTask(chatId, user, data) {
        if (await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        const taskId = data.replace('start_task_', '');
        const task = await this.taskRepo.findOne({ where: { id: taskId } });
        if (!task || !task.active) {
            await this.sendMessage(chatId, '❌ Задание недоступно', {
                inline_keyboard: [[{ text: '🔙 К заданиям', callback_data: 'tasks' }]],
            });
            return;
        }
        const userRank = await this.ranksService.getUserRank(user.id);
        const userRankLevel = userRank.current_rank;
        const hasPlatinum = userRank.platinum_active && userRank.platinum_expires_at && new Date() < userRank.platinum_expires_at;
        let isAvailableForUser = true;
        if (task.available_for === 'platinum') {
            isAvailableForUser = hasPlatinum;
        }
        else if (task.available_for === 'ranks' && task.target_ranks) {
            try {
                const targetRanks = JSON.parse(task.target_ranks);
                if (Array.isArray(targetRanks)) {
                    isAvailableForUser = hasPlatinum || targetRanks.includes(userRankLevel);
                }
            }
            catch (e) {
                this.logger.warn(`Failed to parse target_ranks for task ${task.id}: ${e.message}`);
                isAvailableForUser = true;
            }
        }
        if (!isAvailableForUser) {
            await this.sendMessage(chatId, '❌ Задание недоступно для вашего ранга/подписки', {
                inline_keyboard: [[{ text: '🔙 К заданиям', callback_data: 'tasks' }]],
            });
            return;
        }
        const completedCount = await this.userTaskRepo.count({
            where: { user_id: user.id, task_id: task.id, status: 'completed' },
        });
        if (completedCount >= task.max_per_user) {
            await this.sendMessage(chatId, '✅ Вы уже выполнили это задание максимальное количество раз', {
                inline_keyboard: [[{ text: '🔙 К заданиям', callback_data: 'tasks' }]],
            });
            return;
        }
        const existingInProgress = await this.userTaskRepo.findOne({
            where: { user_id: user.id, task_id: task.id, status: 'in_progress' },
        });
        const existingSubmitted = await this.userTaskRepo.findOne({
            where: { user_id: user.id, task_id: task.id, status: 'submitted' },
        });
        if (existingInProgress || existingSubmitted) {
            await this.sendMessage(chatId, '⏳ Это задание уже выполняется или находится на проверке', {
                inline_keyboard: [[{ text: '🔙 К заданиям', callback_data: 'tasks' }]],
            });
            return;
        }
        const userTask = this.userTaskRepo.create({
            user_id: user.id,
            task_id: task.id,
            status: 'in_progress',
            started_at: new Date(),
            reward_received: 0,
        });
        await this.userTaskRepo.save(userTask);
        let text = `▶️ *Задание начато!*\n\n`;
        text += `📋 ${task.title}\n\n`;
        text += `📝 *Инструкция:*\n${task.description}\n\n`;
        if (task.action_url) {
            text += `🔗 *Перейдите по ссылке и выполните задание:*\n${task.action_url}\n\n`;
        }
        text += `После выполнения нажмите кнопку "Я выполнил задание"`;
        await this.sendMessage(chatId, text, {
            inline_keyboard: [
                [{ text: '✅ Я выполнил задание', callback_data: `submit_task_${task.id}` }],
                [{ text: '🔙 К заданиям', callback_data: 'tasks' }],
            ],
        });
    }
    async submitTask(chatId, user, data) {
        if (await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        const taskId = data.replace('submit_task_', '');
        const task = await this.taskRepo.findOne({ where: { id: taskId } });
        if (!task || !task.active) {
            await this.sendMessage(chatId, '❌ Задание недоступно', {
                inline_keyboard: [[{ text: '🔙 К заданиям', callback_data: 'tasks' }]],
            });
            return;
        }
        const userRank = await this.ranksService.getUserRank(user.id);
        const userRankLevel = userRank.current_rank;
        const hasPlatinum = userRank.platinum_active && userRank.platinum_expires_at && new Date() < userRank.platinum_expires_at;
        let isAvailableForUser = true;
        if (task.available_for === 'platinum') {
            isAvailableForUser = hasPlatinum;
        }
        else if (task.available_for === 'ranks' && task.target_ranks) {
            try {
                const targetRanks = JSON.parse(task.target_ranks);
                if (Array.isArray(targetRanks)) {
                    isAvailableForUser = hasPlatinum || targetRanks.includes(userRankLevel);
                }
            }
            catch (e) {
                this.logger.warn(`Failed to parse target_ranks for task ${task.id}: ${e.message}`);
                isAvailableForUser = true;
            }
        }
        if (!isAvailableForUser) {
            await this.sendMessage(chatId, '❌ Задание недоступно для вашего ранга/подписки', {
                inline_keyboard: [[{ text: '🔙 К заданиям', callback_data: 'tasks' }]],
            });
            return;
        }
        const userTask = await this.userTaskRepo.findOne({
            where: { user_id: user.id, task_id: task.id, status: 'in_progress' },
        });
        if (!userTask) {
            await this.sendMessage(chatId, '❌ Задание не найдено. Начните его выполнение заново.');
            return;
        }
        if (task.min_completion_time > 0 && userTask.started_at) {
            const now = new Date();
            const startedAt = new Date(userTask.started_at);
            const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / (1000 * 60));
            const remainingMinutes = task.min_completion_time - elapsedMinutes;
            if (remainingMinutes > 0) {
                const hours = Math.floor(remainingMinutes / 60);
                const minutes = remainingMinutes % 60;
                let timeText = '';
                if (hours > 0) {
                    timeText = `${hours} ч ${minutes} мин`;
                }
                else {
                    timeText = `${minutes} мин`;
                }
                await this.sendMessage(chatId, `⏳ *Подождите немного!*\n\n` +
                    `Кнопка подтверждения выполнения станет доступна через:\n` +
                    `⏱️ ${timeText}\n\n` +
                    `Это необходимо для проверки честного выполнения задания.`, {
                    inline_keyboard: [
                        [{ text: '🔙 К заданиям', callback_data: 'tasks' }],
                    ],
                });
                return;
            }
        }
        if (task.task_type === 'subscription' && task.channel_id) {
            const isSubscribed = await this.checkChannelSubscription(user.tg_id, task.channel_id);
            if (!isSubscribed) {
                await this.sendMessage(chatId, `❌ *Подписка не найдена!*\n\n` +
                    `Для получения награды необходимо:\n` +
                    `1️⃣ Подписаться на канал\n` +
                    `2️⃣ Нажать "Проверить подписку"`, {
                    inline_keyboard: [
                        [{ text: '📢 Подписаться на канал', url: `https://t.me/${task.channel_id.replace('@', '')}` }],
                        [{ text: '🔄 Проверить подписку', callback_data: `submit_task_${taskId}` }],
                        [{ text: '🔙 К заданиям', callback_data: 'tasks' }],
                    ],
                });
                return;
            }
            this.logger.log(`✅ Subscription verified: user ${user.tg_id}, channel ${task.channel_id}`);
        }
        const reward_min = parseFloat(task.reward_min.toString());
        const reward_max = parseFloat(task.reward_max.toString());
        const baseReward = parseFloat((reward_min + Math.random() * (reward_max - reward_min)).toFixed(2));
        const reward = this.ranksService.applyRankBonus(baseReward, parseFloat(userRank.bonus_percentage.toString()));
        this.logger.log(`💰 Calculated reward for task "${task.title}": ${baseReward} USDT (base) -> ${reward} USDT (with +${userRank.bonus_percentage}% rank bonus)`);
        const requiresManualReview = task.task_type === 'manual' || task.reward_max > 50;
        if (requiresManualReview) {
            userTask.status = 'submitted';
            userTask.reward = reward;
            userTask.reward_received = 0;
            userTask.submitted_at = new Date();
            await this.userTaskRepo.save(userTask);
            await this.sendMessage(chatId, `📝 *Задание отправлено на модерацию*\n\n` +
                `📋 ${task.title}\n` +
                `💰 Потенциальная награда: *${reward.toFixed(2)} USDT*\n\n` +
                `━━━━━━━━━━━━━━━━\n` +
                `⏳ *Статус:* На проверке\n` +
                `📬 Мы проверим выполнение задания в ближайшее время.\n\n` +
                `✅ При успешной проверке средства будут зачислены на ваш счет.\n` +
                `❌ В случае отклонения вы получите уведомление с причиной.`, {
                inline_keyboard: [[{ text: '🔙 К заданиям', callback_data: 'tasks' }]],
            });
        }
        else {
            userTask.status = 'completed';
            userTask.reward = reward;
            userTask.reward_received = reward;
            userTask.completed_at = new Date();
            await this.userTaskRepo.save(userTask);
            const balanceBefore = parseFloat(user.balance_usdt.toString());
            const balanceAfter = balanceBefore + reward;
            user.balance_usdt = balanceAfter;
            user.total_earned = parseFloat(user.total_earned.toString()) + reward;
            user.tasks_completed = user.tasks_completed + 1;
            await this.userRepo.save(user);
            await this.ranksService.incrementTasksCompleted(user.id);
            const rankUpdate = await this.ranksService.checkAndUpdateRank(user.id);
            if (rankUpdate.leveledUp) {
                const rankNames = { stone: 'Камень', bronze: 'Бронза', silver: 'Серебро', gold: 'Золото', platinum: 'Платина' };
                const rankEmojis = { stone: '🪨', bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' };
                setTimeout(() => {
                    this.sendMessage(chatId, `🎉 *Поздравляем!*\n\n` +
                        `${rankEmojis[rankUpdate.newLevel]} Ты достиг ранга *${rankNames[rankUpdate.newLevel]}*!\n\n` +
                        `💰 Новый бонус: *+${rankUpdate.rank.bonus_percentage}%* ко всем наградам!\n\n` +
                        (rankUpdate.newLevel === 'gold' ? `💎 Теперь доступна Платиновая подписка!\nИспользуй !premium_info для подробностей` : '')).catch(err => this.logger.error('Failed to send rank up notification:', err));
                }, 2000);
            }
            await this.balanceLogRepo.save({
                user_id: user.id,
                delta: reward,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                reason: 'task_reward',
                comment: `Награда за выполнение задания: ${task.title}`,
            });
            this.logger.log(`User ${user.tg_id} completed task ${task.id} and earned ${reward} USDT`);
            await this.sendMessage(chatId, `✅ *Задание выполнено успешно!*\n\n` +
                `📋 ${task.title}\n` +
                `💰 Награда: *+${reward.toFixed(2)} USDT*\n\n` +
                `━━━━━━━━━━━━━━━━\n` +
                `💳 Текущий баланс: *${balanceAfter.toFixed(2)} USDT*\n` +
                `✨ Выполнено заданий: ${user.tasks_completed}\n` +
                `📈 Всего заработано: ${user.total_earned.toFixed(2)} USDT\n\n` +
                `Поздравляем! Средства зачислены на ваш счет. 🎉`, {
                inline_keyboard: [
                    [{ text: '📋 Другие задания', callback_data: 'tasks' }],
                    [{ text: '💰 Мой баланс', callback_data: 'balance' }],
                ],
            });
            this.sendBalanceChangeNotification(user.tg_id, balanceBefore, balanceAfter, reward, 'task_reward', `Награда за выполнение задания: ${task.title}`).catch(error => {
                this.logger.error(`Failed to send task reward notification:`, error.message);
            });
            this.fakeStatsService.regenerateFakeStats().catch(error => {
                this.logger.error(`Failed to update fake stats after task completion:`, error.message);
            });
        }
    }
    async cancelTask(chatId, user, data) {
        if (await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        const taskId = data.replace('cancel_task_', '');
        const userTask = await this.userTaskRepo.findOne({
            where: { user_id: user.id, task_id: taskId, status: 'in_progress' },
        });
        if (userTask) {
            await this.userTaskRepo.remove(userTask);
            await this.sendMessage(chatId, '❌ Задание отменено', {
                inline_keyboard: [[{ text: '🔙 К заданиям', callback_data: 'tasks' }]],
            });
        }
        else {
            await this.sendMessage(chatId, 'Задание не найдено', {
                inline_keyboard: [[{ text: '🔙 К заданиям', callback_data: 'tasks' }]],
            });
        }
    }
    async showMyTasks(chatId, user) {
        if (await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        const inProgressTasks = await this.userTaskRepo.find({
            where: { user_id: user.id, status: 'in_progress' },
            relations: ['task'],
        });
        const submittedTasks = await this.userTaskRepo.find({
            where: { user_id: user.id, status: 'submitted' },
            relations: ['task'],
        });
        const completedTasks = await this.userTaskRepo.find({
            where: { user_id: user.id, status: 'completed' },
            relations: ['task'],
            order: { completed_at: 'DESC' },
            take: 10,
        });
        let text = `📚 *МОИ ЗАДАНИЯ*\n\n`;
        if (inProgressTasks.length > 0 || submittedTasks.length > 0) {
            text += `🟢 *АКТИВНЫЕ (${inProgressTasks.length + submittedTasks.length})*\n`;
            for (const userTask of inProgressTasks) {
                if (userTask.task) {
                    text += `├─ ▶️ ${userTask.task.title} (в процессе)\n`;
                }
            }
            for (const userTask of submittedTasks) {
                if (userTask.task) {
                    text += `├─ ⏳ ${userTask.task.title} (на проверке)\n`;
                }
            }
            text += `\n`;
        }
        if (completedTasks.length > 0) {
            text += `✅ *ЗАВЕРШЁННЫЕ (последние 10)*\n`;
            for (const userTask of completedTasks.slice(0, 5)) {
                if (userTask.task) {
                    const date = userTask.completed_at?.toLocaleDateString('ru-RU') || 'N/A';
                    text += `├─ ${userTask.task.title} (+${userTask.reward} USDT) - ${date}\n`;
                }
            }
            text += `\n`;
        }
        text += `📊 *СТАТИСТИКА*\n`;
        text += `✅ Всего выполнено: ${user.tasks_completed} заданий\n`;
        text += `💰 Всего заработано: ${user.total_earned} USDT\n`;
        await this.sendMessage(chatId, text, {
            inline_keyboard: [
                [{ text: '📋 Доступные задания', callback_data: 'tasks' }],
                [{ text: '🔙 Главное меню', callback_data: 'menu' }],
            ],
        });
    }
    async handleCustomButton(chatId, user, button) {
        if (await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        let text = 'Информация';
        let keyboard = { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'menu' }]] };
        if (button.action_payload?.script || button.action_payload?.webhook_url || button.action_payload?.function_name) {
            try {
                if (button.action_payload.script) {
                    this.logger.log(`Executing script for button ${button.id}`);
                    let scriptCode = button.action_payload.script;
                    if (typeof scriptCode !== 'string') {
                        scriptCode = String(scriptCode);
                    }
                    scriptCode = scriptCode.trim();
                    scriptCode = scriptCode.replace(/\\`/g, '`');
                    scriptCode = scriptCode.replace(/\\\$\{/g, '${');
                    this.logger.log(`Script code (length: ${scriptCode.length}):`, scriptCode);
                    const isJavaScriptCode = /(function|=>|return|const|let|var|if|for|while|switch|class|async|await)/i.test(scriptCode);
                    if (!isJavaScriptCode) {
                        text = scriptCode
                            .replace(/{username}/g, user.username || user.first_name || 'Друг')
                            .replace(/{balance}/g, user.balance_usdt.toString())
                            .replace(/{tasks_completed}/g, user.tasks_completed.toString())
                            .replace(/{chat_id}/g, chatId)
                            .replace(/{user_id}/g, user.tg_id);
                    }
                    else {
                        const userData = {
                            id: user.id,
                            tg_id: user.tg_id,
                            userId: user.tg_id,
                            username: user.username,
                            firstName: user.first_name,
                            first_name: user.first_name,
                            balance: user.balance_usdt,
                            balance_usdt: user.balance_usdt,
                            tasksCompleted: user.tasks_completed,
                            tasks_completed: user.tasks_completed,
                        };
                        let functionBody = '';
                        try {
                            const userJsonStr = JSON.stringify(userData);
                            const userIdStr = JSON.stringify(user.tg_id);
                            const chatIdStr = JSON.stringify(chatId);
                            const buttonDataStr = JSON.stringify({
                                id: button.id,
                                label: button.label || '',
                                action: 'execute',
                                command: button.command || null
                            });
                            this.logger.log(`ButtonData being passed to script:`, {
                                id: button.id,
                                label: button.label || '',
                                action: 'execute',
                                command: button.command || null
                            });
                            this.logger.log(`ScriptCode before insertion (length: ${scriptCode.length}):`, scriptCode);
                            this.logger.log(`ScriptCode type: ${typeof scriptCode}, is empty: ${!scriptCode || scriptCode.length === 0}`);
                            const part1 = '// Initialize context\n' +
                                'const user = ' + userJsonStr + ';\n' +
                                'const userId = ' + userIdStr + ';\n' +
                                'const chatId = ' + chatIdStr + ';\n' +
                                'const buttonData = ' + buttonDataStr + ';\n' +
                                '\n' +
                                '// Helper function to get user by ID\n' +
                                'function getUserById(id) {\n' +
                                '  if (id === userId || id === user.tg_id || String(id) === String(userId)) {\n' +
                                '    return user;\n' +
                                '  }\n' +
                                '  return null;\n' +
                                '}\n' +
                                '\n' +
                                '// User script code\n';
                            this.logger.log(`Part1 length: ${part1.length}`);
                            this.logger.log(`ScriptCode length: ${scriptCode ? scriptCode.length : 0}`);
                            let processedScriptCode = scriptCode.trim();
                            const functionMatches = processedScriptCode.match(/function\s+\w+\s*\(/g);
                            if (functionMatches) {
                                const openBraces = (processedScriptCode.match(/{/g) || []).length;
                                const closeBraces = (processedScriptCode.match(/}/g) || []).length;
                                if (openBraces > closeBraces) {
                                    const missingBraces = openBraces - closeBraces;
                                    this.logger.log(`Warning: Script has ${openBraces} opening braces but only ${closeBraces} closing braces. Adding ${missingBraces} closing brace(s).`);
                                    processedScriptCode += '\n' + '}'.repeat(missingBraces);
                                }
                            }
                            const part2 = processedScriptCode + '\n' +
                                '\n';
                            this.logger.log(`Part2 length: ${part2.length}, first 200 chars:`, part2.substring(0, 200));
                            this.logger.log(`Part2 last 50 chars:`, part2.substring(Math.max(0, part2.length - 50)));
                            const part3 = '// Auto-execute handleButton if defined\n' +
                                'if (typeof handleButton === "function") {\n' +
                                '  try {\n' +
                                '    const buttonResult = handleButton(userId, chatId, buttonData);\n' +
                                '    if (buttonResult) {\n' +
                                '      if (buttonResult && typeof buttonResult === "object" && buttonResult.message) {\n' +
                                '        return buttonResult.message;\n' +
                                '      }\n' +
                                '      if (typeof buttonResult === "string") {\n' +
                                '        return buttonResult;\n' +
                                '      }\n' +
                                '      if (typeof buttonResult === "object") {\n' +
                                '        return JSON.stringify(buttonResult);\n' +
                                '      }\n' +
                                '    }\n' +
                                '  } catch (e) {\n' +
                                '    return "Ошибка в handleButton: " + e.message;\n' +
                                '  }\n' +
                                '}\n' +
                                '\n' +
                                '// Auto-execute main if defined\n' +
                                'if (typeof main === "function") {\n' +
                                '  try {\n' +
                                '    const mainResult = main();\n' +
                                '    if (mainResult) {\n' +
                                '      if (typeof mainResult === "object" && mainResult.message) {\n' +
                                '        return mainResult.message;\n' +
                                '      }\n' +
                                '      return mainResult;\n' +
                                '    }\n' +
                                '  } catch (e) {\n' +
                                '    return "Ошибка в main: " + e.message;\n' +
                                '  }\n' +
                                '}\n' +
                                '\n' +
                                '// Check for message or result variables\n' +
                                'if (typeof message !== "undefined") {\n' +
                                '  return message;\n' +
                                '}\n' +
                                'if (typeof result !== "undefined") {\n' +
                                '  return result;\n' +
                                '}\n' +
                                '\n' +
                                'return "Script executed successfully";';
                            functionBody = part1 + part2 + part3;
                            this.logger.log(`FunctionBody total length: ${functionBody.length}, part1: ${part1.length}, part2: ${part2.length}, part3: ${part3.length}`);
                            this.logger.log(`FunctionBody after scriptCode insertion (length: ${functionBody.length}):`, functionBody.substring(0, 1000));
                            const scriptPosition = functionBody.indexOf('// User script code');
                            if (scriptPosition >= 0) {
                                this.logger.log(`FunctionBody around scriptCode (position ${scriptPosition}, 500 chars):`, functionBody.substring(scriptPosition, scriptPosition + 500));
                                const afterScriptPosition = scriptPosition + 500;
                                if (afterScriptPosition < functionBody.length) {
                                    this.logger.log(`FunctionBody after scriptCode (position ${afterScriptPosition}, 200 chars):`, functionBody.substring(afterScriptPosition, afterScriptPosition + 200));
                                }
                            }
                            else {
                                this.logger.error(`ERROR: "// User script code" not found in functionBody!`);
                            }
                            const functionBodyLines = functionBody.split('\n');
                            this.logger.log(`FunctionBody total lines: ${functionBodyLines.length}`);
                            const scriptLineIndex = functionBodyLines.findIndex(line => line.includes('// User script code'));
                            if (scriptLineIndex >= 0) {
                                const startLine = Math.max(0, scriptLineIndex - 5);
                                const endLine = Math.min(functionBodyLines.length, scriptLineIndex + 20);
                                this.logger.log(`FunctionBody lines ${startLine}-${endLine}:`, functionBodyLines.slice(startLine, endLine).join('\n'));
                            }
                            this.logger.log(`Function body (first 2000 chars, total length: ${functionBody.length}):`, functionBody.substring(0, 2000));
                            if (functionBody.length > 2000) {
                                this.logger.log(`Function body (last 200 chars):`, functionBody.substring(functionBody.length - 200));
                                const middleStart = Math.max(0, 2000 - 100);
                                const middleEnd = Math.min(functionBody.length, 2000 + 100);
                                this.logger.log(`Function body (around 2000 chars, ${middleStart}-${middleEnd}):`, functionBody.substring(middleStart, middleEnd));
                            }
                            try {
                                new Function(functionBody);
                            }
                            catch (parseError) {
                                this.logger.error(`Function body syntax error:`, parseError);
                                this.logger.error(`Function body (first 1000 chars):`, functionBody.substring(0, 1000));
                                this.logger.error(`Function body (full, length: ${functionBody.length}):`);
                                for (let i = 0; i < functionBody.length; i += 500) {
                                    const chunk = functionBody.substring(i, i + 500);
                                    this.logger.error(`Function body chunk [${i}-${i + 500}]:`, chunk);
                                }
                                throw new Error(`Синтаксическая ошибка в скрипте: ${parseError.message}`);
                            }
                            const scriptFunction = new Function(functionBody);
                            const result = scriptFunction();
                            if (typeof result === 'string') {
                                text = result
                                    .replace(/{username}/g, user.username || user.first_name || 'Друг')
                                    .replace(/{balance}/g, user.balance_usdt.toString())
                                    .replace(/{tasks_completed}/g, user.tasks_completed.toString())
                                    .replace(/{chat_id}/g, chatId)
                                    .replace(/{user_id}/g, user.tg_id);
                            }
                            else if (result && typeof result === 'object') {
                                if (result.message) {
                                    text = result.message;
                                }
                                else {
                                    text = JSON.stringify(result);
                                }
                            }
                            else {
                                text = result ? String(result) : '✅ Скрипт выполнен';
                            }
                        }
                        catch (scriptError) {
                            this.logger.error(`Script execution error for button ${button.id}:`, scriptError);
                            this.logger.error(`Script code that failed (full):`, scriptCode);
                            this.logger.error(`Script code length:`, scriptCode.length);
                            if (functionBody.length > 0) {
                                this.logger.error(`Function body (first 2000 chars):`, functionBody.substring(0, 2000));
                            }
                            this.logger.error(`Error stack:`, scriptError.stack);
                            text = `❌ Ошибка выполнения скрипта: ${scriptError.message}\n\nПроверьте синтаксис скрипта.`;
                        }
                    }
                }
                else if (button.action_payload.webhook_url) {
                    this.logger.log(`Calling webhook for button ${button.id}: ${button.action_payload.webhook_url}`);
                    const axios = require('axios');
                    const timeout = button.action_payload.timeout || 5000;
                    try {
                        const response = await axios.post(button.action_payload.webhook_url, {
                            user: {
                                id: user.id,
                                tg_id: user.tg_id,
                                username: user.username,
                                first_name: user.first_name,
                                balance: user.balance_usdt,
                            },
                            chatId: chatId,
                            buttonId: button.id,
                        }, { timeout });
                        text = response.data?.message || response.data?.text || '✅ Функция выполнена успешно';
                    }
                    catch (webhookError) {
                        this.logger.error(`Webhook error for button ${button.id}:`, webhookError);
                        text = `❌ Ошибка вызова webhook: ${webhookError.message}`;
                    }
                }
                else if (button.action_payload.function_name) {
                    this.logger.log(`Calling internal function for button ${button.id}: ${button.action_payload.function_name}`);
                    const functionMap = {
                        'sendProfile': () => this.sendProfile(chatId, user),
                        'sendBalance': () => this.sendBalance(chatId, user),
                        'sendTasks': () => this.sendAvailableTasks(chatId, user),
                        'sendReferralInfo': () => this.sendReferralInfo(chatId, user),
                    };
                    const func = functionMap[button.action_payload.function_name];
                    if (func) {
                        await func();
                        return;
                    }
                    else {
                        text = `❌ Функция "${button.action_payload.function_name}" не найдена`;
                    }
                }
                await this.sendMessage(chatId, text, keyboard);
                return;
            }
            catch (error) {
                this.logger.error(`Error executing function for button ${button.id}:`, error);
                await this.sendMessage(chatId, `❌ Ошибка выполнения функции: ${error.message}`, keyboard);
                return;
            }
        }
        if (button.command && !button.action_payload?.command) {
            this.logger.log(`Executing command from button ${button.id}: ${button.command}`);
            await this.handleCommand(chatId, button.command, user);
            if (!button.action_payload && !button.media_url) {
                return;
            }
        }
        if (button.action_payload?.inline_buttons && Array.isArray(button.action_payload.inline_buttons)) {
            const inlineKeyboard = [];
            button.action_payload.inline_buttons.forEach((btn) => {
                if (btn.url) {
                    inlineKeyboard.push([{ text: btn.text, url: btn.url }]);
                }
                else if (btn.web_app?.url) {
                    inlineKeyboard.push([{ text: btn.text, web_app: { url: btn.web_app.url } }]);
                }
                else if (btn.callback_data) {
                    inlineKeyboard.push([{ text: btn.text, callback_data: btn.callback_data }]);
                }
            });
            if (inlineKeyboard.length > 0) {
                inlineKeyboard.push([{ text: '🔙 Назад', callback_data: 'menu' }]);
            }
            keyboard = { inline_keyboard: inlineKeyboard };
            if (button.action_payload.text) {
                text = button.action_payload.text;
            }
            else if (button.action_payload?.text?.text) {
                text = button.action_payload.text.text;
            }
            else {
                text = button.label || 'Информация';
            }
            text = text
                .replace(/{username}/g, user.username || user.first_name || 'Друг')
                .replace(/{balance}/g, user.balance_usdt.toString())
                .replace(/{tasks_completed}/g, user.tasks_completed.toString());
            if (button.media_url) {
                try {
                    const mediaUrl = button.media_url;
                    const urlWithoutQuery = mediaUrl.split('?')[0];
                    const ext = urlWithoutQuery.split('.').pop()?.toLowerCase() || '';
                    let mediaType = 'photo';
                    if (['mp4', 'mov', 'avi', 'webm', 'ogg'].includes(ext)) {
                        mediaType = 'video';
                    }
                    else if (['pdf', 'doc', 'docx', 'txt', 'zip', 'rar'].includes(ext)) {
                        mediaType = 'document';
                    }
                    else if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                        mediaType = 'photo';
                    }
                    this.logger.log(`Sending media for button ${button.id}: ${mediaType} from ${mediaUrl}`);
                    await this.sendMessageWithMedia(chatId, text, mediaUrl, mediaType);
                    if (keyboard && keyboard.inline_keyboard && keyboard.inline_keyboard.length > 0) {
                        await this.sendMessage(chatId, '👇 Выберите действие:', keyboard);
                    }
                }
                catch (error) {
                    this.logger.error(`Failed to send media for button ${button.id}:`, error);
                    await this.sendMessage(chatId, text, keyboard);
                }
            }
            else {
                await this.sendMessage(chatId, text, keyboard);
            }
            return;
        }
        if (button.action_type === 'text' || button.action_type === 'send_message') {
            let payloadText = '';
            if (typeof button.action_payload === 'string') {
                payloadText = button.action_payload;
            }
            else if (button.action_payload?.text) {
                if (typeof button.action_payload.text === 'string') {
                    payloadText = button.action_payload.text;
                }
                else if (button.action_payload.text?.text) {
                    payloadText = button.action_payload.text.text;
                }
            }
            if (payloadText) {
                text = payloadText
                    .replace(/{username}/g, user.username || user.first_name || 'Друг')
                    .replace(/{balance}/g, user.balance_usdt.toString())
                    .replace(/{tasks_completed}/g, user.tasks_completed.toString());
            }
            else {
                text = button.label || 'Информация';
            }
        }
        else if (button.action_type === 'command' && button.action_payload?.command) {
            const command = button.action_payload.command;
            const commandNormalized = command.startsWith('/') ? command.substring(1) : command;
            switch (commandNormalized) {
                case 'stats':
                    text =
                        `📊 *Статистика*\n\n` +
                            `👤 Пользователей: ${await this.userRepo.count()}\n` +
                            `💰 Общий баланс: ${(await this.userRepo.sum('balance_usdt')) || 0} USDT\n` +
                            `📋 Заданий выполнено: ${await this.userTaskRepo.count()}`;
                    break;
                case 'balance':
                    await this.sendBalance(chatId, user);
                    return;
                case 'tasks':
                    await this.sendAvailableTasks(chatId, user);
                    return;
                case 'bonus':
                    text =
                        `🎁 *Бонусы*\n\n` +
                            `💰 Ваш баланс: ${user.balance_usdt} USDT\n` +
                            `📋 Выполнено заданий: ${user.tasks_completed}\n` +
                            `💎 Общий заработок: ${user.total_earned} USDT`;
                    break;
                case 'support':
                    text =
                        `📞 *Поддержка*\n\n` +
                            `Если у вас есть вопросы или проблемы, обратитесь к администратору.\n\n` +
                            `Мы поможем вам разобраться с любыми вопросами!`;
                    break;
                case 'settings':
                    text =
                        `⚙️ *Настройки*\n\n` +
                            `🔔 Уведомления: Включены\n` +
                            `🌐 Язык: Русский\n` +
                            `📱 Тема: Системная`;
                    break;
                case 'payouts':
                    text =
                        `📋 *Заявки на вывод*\n\n` +
                            `Для вывода средств используйте команду:\n` +
                            `\`wallet АДРЕС_КОШЕЛЬКА СУММА\`\n\n` +
                            `Пример: \`wallet TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE 10\``;
                    break;
                case 'referrals':
                    await this.sendReferralInfo(chatId, user);
                    return;
                case 'profile':
                    await this.sendProfile(chatId, user);
                    return;
                case 'info':
                    text =
                        `ℹ️ *Информация*\n\n` +
                            `🤖 Добро пожаловать в наш бот!\n` +
                            `💰 Зарабатывайте USDT выполняя задания\n` +
                            `👥 Приглашайте друзей и получайте бонусы\n` +
                            `📋 Выполняйте задания и увеличивайте баланс`;
                    break;
                case 'notifications':
                    text =
                        `🔔 *Уведомления*\n\n` +
                            `📢 Новые задания\n` +
                            `💰 Пополнения баланса\n` +
                            `🎁 Бонусы и акции\n` +
                            `📞 Сообщения поддержки`;
                    break;
                default:
                    const commandText = command.startsWith('/') ? command : `/${command}`;
                    await this.handleCommand(chatId, commandText, user);
                    return;
            }
        }
        else if (button.action_type === 'send_message' && button.action_payload?.text) {
            text = button.action_payload.text;
            text = text
                .replace('{username}', user.username || user.first_name || 'Friend')
                .replace('{balance}', user.balance_usdt.toString())
                .replace('{tasks_completed}', user.tasks_completed.toString());
        }
        else if (button.action_type === 'open_url' || (button.action_type === 'url' && button.action_payload?.url)) {
            text = button.action_payload?.text || 'Перейдите по ссылке ниже';
            if (button.action_payload?.inline_buttons && Array.isArray(button.action_payload.inline_buttons)) {
                const inlineKeyboard = [];
                inlineKeyboard.push([{ text: '🔗 Перейти', url: button.action_payload.url }]);
                button.action_payload.inline_buttons.forEach((btn) => {
                    if (btn.url) {
                        inlineKeyboard.push([{ text: btn.text, url: btn.url }]);
                    }
                    else if (btn.web_app?.url) {
                        inlineKeyboard.push([{ text: btn.text, web_app: { url: btn.web_app.url } }]);
                    }
                    else if (btn.callback_data) {
                        inlineKeyboard.push([{ text: btn.text, callback_data: btn.callback_data }]);
                    }
                });
                inlineKeyboard.push([{ text: '🔙 Назад', callback_data: 'menu' }]);
                keyboard = { inline_keyboard: inlineKeyboard };
            }
            else {
                keyboard = {
                    inline_keyboard: [
                        [{ text: '🔗 Перейти', url: button.action_payload.url }],
                        [{ text: '🔙 Назад', callback_data: 'menu' }],
                    ],
                };
            }
        }
        if (button.media_url) {
            try {
                const mediaUrl = button.media_url;
                const urlWithoutQuery = mediaUrl.split('?')[0];
                const ext = urlWithoutQuery.split('.').pop()?.toLowerCase() || '';
                let mediaType = 'photo';
                if (['mp4', 'mov', 'avi', 'webm', 'ogg'].includes(ext)) {
                    mediaType = 'video';
                }
                else if (['pdf', 'doc', 'docx', 'txt', 'zip', 'rar'].includes(ext)) {
                    mediaType = 'document';
                }
                else if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                    mediaType = 'photo';
                }
                this.logger.log(`Sending media for button ${button.id}: ${mediaType} from ${mediaUrl}`);
                await this.sendMessageWithMedia(chatId, text, mediaUrl, mediaType);
                if (keyboard && keyboard.inline_keyboard && keyboard.inline_keyboard.length > 0) {
                    await this.sendMessage(chatId, '👇 Выберите действие:', keyboard);
                }
            }
            catch (error) {
                this.logger.error(`Failed to send media for button ${button.id}:`, error);
                await this.sendMessage(chatId, text, keyboard);
            }
        }
        else {
            await this.sendMessage(chatId, text, keyboard);
        }
    }
    async handleCustomCommand(chatId, user, command) {
        if (await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        const actionType = command.action_type || 'text';
        const payload = command.action_payload || {};
        if (actionType === 'function' && payload.type === 'script' && payload.script) {
            try {
                this.logger.log(`Executing script for command ${command.id}`);
                let scriptCode = payload.script;
                if (typeof scriptCode !== 'string') {
                    scriptCode = String(scriptCode);
                }
                scriptCode = scriptCode.trim();
                scriptCode = scriptCode.replace(/\\`/g, '`');
                scriptCode = scriptCode.replace(/\\\$\{/g, '${');
                const userData = {
                    id: user.id,
                    tg_id: user.tg_id,
                    userId: user.tg_id,
                    username: user.username,
                    firstName: user.first_name,
                    first_name: user.first_name,
                    balance: user.balance_usdt,
                    balance_usdt: user.balance_usdt,
                    tasksCompleted: user.tasks_completed,
                    tasks_completed: user.tasks_completed,
                };
                let functionBody = '';
                try {
                    const userJsonStr = JSON.stringify(userData);
                    const userIdStr = JSON.stringify(user.tg_id);
                    const chatIdStr = JSON.stringify(chatId);
                    const commandDataStr = JSON.stringify({
                        id: command.id,
                        name: command.name,
                        description: command.description,
                    });
                    let processedScriptCode = scriptCode.trim();
                    const openBraces = (processedScriptCode.match(/{/g) || []).length;
                    const closeBraces = (processedScriptCode.match(/}/g) || []).length;
                    if (openBraces > closeBraces) {
                        const missingBraces = openBraces - closeBraces;
                        processedScriptCode += '\n' + '}'.repeat(missingBraces);
                    }
                    functionBody = '// Initialize context\n' +
                        'const user = ' + userJsonStr + ';\n' +
                        'const userId = ' + userIdStr + ';\n' +
                        'const chatId = ' + chatIdStr + ';\n' +
                        'const commandData = ' + commandDataStr + ';\n' +
                        '\n' +
                        'function getUserById(id) {\n' +
                        '  if (id === userId || id === user.tg_id || String(id) === String(userId)) {\n' +
                        '    return user;\n' +
                        '  }\n' +
                        '  return null;\n' +
                        '}\n' +
                        '\n' +
                        '// User script code\n' +
                        processedScriptCode + '\n' +
                        '\n' +
                        '// Auto-execute handleCommand if defined\n' +
                        'if (typeof handleCommand === "function") {\n' +
                        '  try {\n' +
                        '    const commandResult = handleCommand(userId, chatId, commandData);\n' +
                        '    if (commandResult) {\n' +
                        '      if (commandResult && typeof commandResult === "object" && commandResult.message) {\n' +
                        '        return commandResult.message;\n' +
                        '      }\n' +
                        '      if (typeof commandResult === "string") {\n' +
                        '        return commandResult;\n' +
                        '      }\n' +
                        '    }\n' +
                        '  } catch (e) {\n' +
                        '    return "Ошибка в handleCommand: " + e.message;\n' +
                        '  }\n' +
                        '}\n' +
                        '\n' +
                        'return "Script executed successfully";';
                    const scriptFunction = new Function(functionBody);
                    const result = scriptFunction();
                    if (result && typeof result === 'string') {
                        await this.sendMessage(chatId, result, await this.getReplyKeyboard());
                    }
                    else {
                        await this.sendMessage(chatId, 'Script executed successfully', await this.getReplyKeyboard());
                    }
                }
                catch (error) {
                    this.logger.error(`Error executing command script: ${error.message}`, error.stack);
                    await this.sendMessage(chatId, `❌ Ошибка выполнения команды: ${error.message}`, await this.getReplyKeyboard());
                }
            }
            catch (error) {
                this.logger.error(`Error in handleCustomCommand script: ${error.message}`, error.stack);
                await this.sendMessage(chatId, `❌ Ошибка: ${error.message}`, await this.getReplyKeyboard());
            }
            return;
        }
        if (actionType === 'function' && payload.type === 'webhook' && payload.url) {
            try {
                const response = await fetch(payload.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.tg_id,
                        chatId,
                        command: command.name,
                        user: {
                            id: user.id,
                            tg_id: user.tg_id,
                            username: user.username,
                            first_name: user.first_name,
                            balance: user.balance_usdt,
                            tasks_completed: user.tasks_completed,
                        },
                    }),
                    signal: AbortSignal.timeout((payload.timeout || 30) * 1000),
                });
                if (response.ok) {
                    const data = await response.json();
                    const message = data.message || data.text || 'Webhook executed successfully';
                    await this.sendMessage(chatId, message, await this.getReplyKeyboard(user?.tg_id));
                }
                else {
                    await this.sendMessage(chatId, '❌ Ошибка выполнения webhook', await this.getReplyKeyboard());
                }
            }
            catch (error) {
                this.logger.error(`Error executing webhook: ${error.message}`);
                await this.sendMessage(chatId, `❌ Ошибка webhook: ${error.message}`, await this.getReplyKeyboard());
            }
            return;
        }
        if (actionType === 'function' && payload.type === 'internal' && payload.function_name) {
            const functionName = payload.function_name;
            if (functionName === 'sendBalance') {
                await this.sendBalance(chatId, user);
            }
            else if (functionName === 'sendTasks') {
                await this.sendAvailableTasks(chatId, user);
            }
            else if (functionName === 'sendRankInfo') {
                await this.sendRankInfo(chatId, user);
            }
            else if (functionName === 'sendProfile') {
                await this.sendProfile(chatId, user);
            }
            else {
                await this.sendMessage(chatId, `❌ Неизвестная внутренняя функция: ${functionName}`, await this.getReplyKeyboard());
            }
            return;
        }
        if (actionType === 'command' && payload.command) {
            const commandText = payload.command.startsWith('/') ? payload.command : `/${payload.command}`;
            await this.handleCommand(chatId, commandText, user);
            return;
        }
        if (actionType === 'url' && payload.url) {
            const text = payload.text || 'Перейдите по ссылке ниже';
            const keyboard = {
                inline_keyboard: [
                    [{ text: '🔗 Перейти', url: payload.url }],
                    [{ text: '🔙 Назад', callback_data: 'menu' }],
                ],
            };
            await this.sendMessage(chatId, text, keyboard);
            return;
        }
        if (actionType === 'media' && payload.media_url) {
            const text = payload.text || '';
            const mediaUrl = payload.media_url;
            const caption = payload.caption || text;
            await this.sendMessageWithMedia(chatId, caption, mediaUrl);
            return;
        }
        let text = payload.text || command.response || '';
        if (text) {
            text = text
                .replace(/{username}/g, user.username || user.first_name || 'Друг')
                .replace(/{balance}/g, user.balance_usdt.toString())
                .replace(/{tasks_completed}/g, user.tasks_completed.toString())
                .replace(/{chat_id}/g, chatId)
                .replace(/{user_id}/g, user.tg_id);
            if (command.media_url) {
                await this.sendMessageWithMedia(chatId, text, command.media_url);
            }
            else {
                await this.sendMessage(chatId, text, await this.getReplyKeyboard());
            }
        }
    }
    async handleTaskVerification(chatId, user, data) {
        if (await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        const parts = data.replace('verify_', '').split('_');
        if (parts.length < 2) {
            await this.sendMessage(chatId, '❌ Неверный формат данных');
            return;
        }
        const taskId = parts[0];
        const reward = parseFloat(parts[1]);
        const task = await this.taskRepo.findOne({ where: { id: taskId } });
        if (!task) {
            await this.sendMessage(chatId, '❌ Задание не найдено');
            return;
        }
        const completedCount = await this.userTaskRepo.count({
            where: { user_id: user.id, task_id: taskId },
        });
        if (completedCount >= task.max_per_user) {
            await this.sendMessage(chatId, '✅ Вы уже выполнили это задание максимальное количество раз');
            return;
        }
        const userTask = this.userTaskRepo.create({
            user_id: user.id,
            task_id: taskId,
            reward_received: reward,
            status: 'completed',
        });
        await this.userTaskRepo.save(userTask);
        const balanceBefore = parseFloat(user.balance_usdt.toString());
        const balanceAfter = balanceBefore + reward;
        user.balance_usdt = balanceAfter;
        user.total_earned = parseFloat(user.total_earned.toString()) + reward;
        user.tasks_completed = user.tasks_completed + 1;
        await this.userRepo.save(user);
        await this.balanceLogRepo.save({
            user_id: user.id,
            delta: reward,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            reason: 'task_reward',
            comment: `Награда за выполнение задания (верифицировано): ${task.title}`,
        });
        const text = `✅ *Задание выполнено!*\n\n` +
            `💰 Вы получили: ${reward} USDT\n` +
            `💵 Ваш новый баланс: ${user.balance_usdt} USDT\n\n` +
            `Продолжайте выполнять задания!`;
        const keyboard = {
            inline_keyboard: [
                [{ text: '📋 Другие задания', callback_data: 'tasks' }],
                [{ text: '💰 Баланс', callback_data: 'balance' }],
            ],
        };
        await this.sendMessage(chatId, text, keyboard);
        this.logger.log(`User ${user.tg_id} completed task ${taskId} and earned ${reward} USDT`);
        this.sendBalanceChangeNotification(user.tg_id, balanceBefore, balanceAfter, reward, 'task_reward', `Награда за выполнение задания (верифицировано): ${task.title}`).catch(error => {
            this.logger.error(`Failed to send task verification notification:`, error.message);
        });
        this.fakeStatsService.regenerateFakeStats().catch(error => {
            this.logger.error(`Failed to update fake stats after task verification:`, error.message);
        });
    }
    async handleWithdrawalRequest(chatId, user, text) {
        if (await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        const parts = text.split(' ');
        if (parts.length < 3) {
            await this.sendMessage(chatId, '❌ Неверный формат. Используйте:\nwallet YOUR_WALLET_ADDRESS AMOUNT\nПример: wallet TXxxx...xxx 50');
            return;
        }
        const walletAddress = parts[1];
        const amount = parseFloat(parts[2]);
        if (isNaN(amount) || amount <= 0) {
            await this.sendMessage(chatId, '❌ Неверная сумма');
            return;
        }
        const minWithdraw = parseFloat(await this.settingsService.getValue('min_withdraw_usdt', '10.00'));
        const maxWithdraw = parseFloat(await this.settingsService.getValue('max_withdraw_usdt', '5000.00'));
        if (amount < minWithdraw) {
            await this.sendMessage(chatId, `❌ Минимальная сумма для вывода: ${minWithdraw} USDT`);
            return;
        }
        if (amount > maxWithdraw) {
            await this.sendMessage(chatId, `❌ Максимальная сумма для вывода: ${maxWithdraw} USDT`);
            return;
        }
        if (parseFloat(user.balance_usdt.toString()) < amount) {
            await this.sendMessage(chatId, `❌ Недостаточно средств. Ваш баланс: ${user.balance_usdt} USDT`);
            return;
        }
        if (!walletAddress.startsWith('T') || walletAddress.length !== 34) {
            await this.sendMessage(chatId, '❌ Неверный формат адреса кошелька TRC20 (должен начинаться с T и иметь 34 символа)');
            return;
        }
        try {
            await this.usersService.createPayoutRequest(user, amount, walletAddress);
            await this.sendMessage(chatId, `✅ *Заявка на вывод создана!*\n\n` +
                `💰 Сумма: ${amount} USDT\n` +
                `💳 Кошелёк: ${walletAddress}\n\n` +
                `⏳ Ваша заявка будет обработана в течение 24 часов.\n` +
                `Вы получите уведомление после обработки.`);
            this.logger.log(`Withdrawal request created: user ${user.tg_id}, amount ${amount} USDT, wallet ${walletAddress}`);
        }
        catch (error) {
            this.logger.error('Error creating withdrawal request:', error);
            await this.sendMessage(chatId, '❌ Ошибка при создании заявки. Попробуйте позже.');
        }
    }
    async findMatchingScenario(text) {
        if (!text)
            return null;
        const cacheKey = 'scenarios:active';
        let scenarios = this.syncService.getCache(cacheKey);
        if (!scenarios) {
            scenarios = await this.scenarioRepo.find({
                where: { active: true },
            });
            this.syncService.setCache(cacheKey, scenarios, 60);
        }
        const textLower = text.toLowerCase().trim();
        for (const scenario of scenarios) {
            const triggerLower = scenario.trigger.toLowerCase().trim();
            if (textLower === triggerLower) {
                return scenario;
            }
            if (textLower.includes(triggerLower) || triggerLower.includes(textLower)) {
                return scenario;
            }
        }
        return null;
    }
    async handleScenario(chatId, user, scenario) {
        if (await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        try {
            if (scenario.response) {
                let text = scenario.response;
                text = text
                    .replace(/{username}/g, user.username || user.first_name || 'Friend')
                    .replace(/{first_name}/g, user.first_name || 'Friend')
                    .replace(/{balance}/g, user.balance_usdt.toString())
                    .replace(/{tasks_completed}/g, user.tasks_completed.toString())
                    .replace(/{total_earned}/g, user.total_earned.toString());
                if (scenario.media_url) {
                    try {
                        const mediaUrl = scenario.media_url;
                        const urlWithoutQuery = mediaUrl.split('?')[0];
                        const ext = urlWithoutQuery.split('.').pop()?.toLowerCase() || '';
                        let mediaType = 'photo';
                        if (['mp4', 'mov', 'avi', 'webm', 'ogg'].includes(ext)) {
                            mediaType = 'video';
                        }
                        else if (['pdf', 'doc', 'docx', 'txt', 'zip', 'rar'].includes(ext)) {
                            mediaType = 'document';
                        }
                        else if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                            mediaType = 'photo';
                        }
                        this.logger.log(`Sending media for scenario ${scenario.id}: ${mediaType} from ${mediaUrl}`);
                        await this.sendMessageWithMedia(chatId, text, mediaUrl, mediaType);
                    }
                    catch (error) {
                        this.logger.error(`Failed to send media for scenario ${scenario.id}:`, error);
                        await this.sendMessage(chatId, text);
                    }
                }
                else {
                    await this.sendMessage(chatId, text);
                }
                return;
            }
            if (scenario.steps && Array.isArray(scenario.steps)) {
                for (const step of scenario.steps) {
                    if (step.type === 'message' && step.text) {
                        let text = step.text;
                        text = text
                            .replace(/{username}/g, user.username || user.first_name || 'Friend')
                            .replace(/{first_name}/g, user.first_name || 'Friend')
                            .replace(/{balance}/g, user.balance_usdt.toString())
                            .replace(/{tasks_completed}/g, user.tasks_completed.toString())
                            .replace(/{total_earned}/g, user.total_earned.toString());
                        await this.sendMessage(chatId, text, step.keyboard);
                    }
                    else if (step.type === 'delay' && step.ms) {
                        await new Promise((resolve) => setTimeout(resolve, step.ms));
                    }
                }
            }
            this.logger.log(`Scenario "${scenario.name}" executed for user ${user.tg_id}`);
        }
        catch (error) {
            this.logger.error(`Error executing scenario "${scenario.name}":`, error);
            await this.sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
        }
    }
    async checkMandatoryChannels(userId) {
        try {
            const activeChannels = await this.channelsService.findActive();
            if (activeChannels.length === 0) {
                return { allSubscribed: true, unsubscribedChannels: [] };
            }
            const unsubscribedChannels = [];
            for (const channel of activeChannels) {
                const isSubscribed = await this.checkChannelSubscription(userId, channel.channel_id);
                if (!isSubscribed) {
                    unsubscribedChannels.push(channel);
                }
            }
            return {
                allSubscribed: unsubscribedChannels.length === 0,
                unsubscribedChannels,
            };
        }
        catch (error) {
            this.logger.error('Error checking mandatory channels:', error);
            return { allSubscribed: true, unsubscribedChannels: [] };
        }
    }
    generateSubscriptionKeyboard(channels, callbackAction = 'check_subscription') {
        const buttons = [];
        channels.forEach(channel => {
            const url = channel.url || `https://t.me/${channel.username || channel.channel_id.replace('@', '')}`;
            buttons.push([{ text: `📢 ${channel.title}`, url }]);
        });
        buttons.push([{ text: '✅ Я подписался', callback_data: callbackAction }]);
        return { inline_keyboard: buttons };
    }
    async checkChannelSubscription(userId, channelId) {
        try {
            this.logger.debug(`🔍 Checking subscription: user=${userId}, channel=${channelId}`);
            const response = await axios_1.default.get(`https://api.telegram.org/bot${this.botToken}/getChatMember`, {
                params: {
                    chat_id: channelId,
                    user_id: userId,
                },
            });
            this.logger.debug(`📡 Telegram API response:`, JSON.stringify(response.data, null, 2));
            if (response.data.ok) {
                const status = response.data.result.status;
                const isSubscribed = ['creator', 'administrator', 'member'].includes(status);
                this.logger.log(`✅ Subscription check: user ${userId}, channel ${channelId}, status=${status}, subscribed=${isSubscribed}`);
                return isSubscribed;
            }
            this.logger.warn(`⚠️ Failed to check subscription: ${response.data.description || 'Unknown error'}`);
            this.logger.warn(`Response:`, JSON.stringify(response.data, null, 2));
            return false;
        }
        catch (error) {
            this.logger.error(`❌ Error checking channel subscription for user ${userId}, channel ${channelId}:`);
            this.logger.error(`Error details:`, error.response?.data || error.message);
            if (error.response?.data) {
                this.logger.error(`Full error response:`, JSON.stringify(error.response.data, null, 2));
            }
            return false;
        }
    }
    async sendRankInfo(chatId, user) {
        if (await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        const { allSubscribed } = await this.checkMandatoryChannels(user.tg_id);
        const rankUpdateResult = await this.ranksService.checkAndUpdateRank(user.id, allSubscribed);
        if (rankUpdateResult.leveledUp) {
            const rankNames = { stone: 'Камень', bronze: 'Бронза', silver: 'Серебро', gold: 'Золото', platinum: 'Платина' };
            const rankEmojis = { stone: '🪨', bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' };
            await this.sendMessage(chatId, `🎉 *Поздравляем!*\n\n` +
                `${rankEmojis[rankUpdateResult.newLevel]} Ты достиг ранга *${rankNames[rankUpdateResult.newLevel]}*!\n\n` +
                `💰 Новый бонус: *+${rankUpdateResult.rank.bonus_percentage}%* ко всем наградам!\n\n` +
                `Продолжай выполнять задания для дальнейшего повышения!`, await this.getReplyKeyboard(user?.tg_id));
        }
        const userRank = await this.ranksService.getUserRank(user.id);
        const progress = await this.ranksService.getRankProgress(user.id);
        const settings = await this.ranksService.getSettings();
        const rankEmojis = {
            stone: '🪨',
            bronze: '🥉',
            silver: '🥈',
            gold: '🥇',
            platinum: '💎',
        };
        const rankNames = {
            stone: 'Камень',
            bronze: 'Бронза',
            silver: 'Серебро',
            gold: 'Золото',
            platinum: 'Платина',
        };
        let text = `${rankEmojis[userRank.current_rank]} *Твой ранг: ${rankNames[userRank.current_rank]}*\n\n`;
        text += `💰 Бонус к наградам: *+${userRank.bonus_percentage}%*\n\n`;
        if (userRank.platinum_active && userRank.platinum_expires_at) {
            const daysLeft = Math.ceil((new Date(userRank.platinum_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            text += `⏰ Платиновая подписка истекает через: *${daysLeft} дней*\n\n`;
        }
        if (progress.nextRank) {
            text += `📊 *Прогресс до ${rankNames[progress.nextRank]}:*\n`;
            if (progress.nextRank === 'bronze') {
                if (progress.channelsSubscribed) {
                    text += `✅ Подписка на каналы: *Выполнено*\n\n`;
                    text += `🎉 Ты готов к повышению до Бронзы!\n`;
                    text += `Продолжай выполнять задания для автоматического повышения.\n\n`;
                }
                else {
                    text += `📢 Подписка на каналы: *Не выполнено*\n`;
                    text += `Подпишись на обязательные каналы для получения ранга Бронза.\n\n`;
                }
            }
            else {
                text += `✅ Выполнено заданий: ${progress.tasksProgress.current}/${progress.tasksProgress.required}\n`;
                text += `👥 Приглашено рефералов: ${progress.referralsProgress.current}/${progress.referralsProgress.required}\n\n`;
                const overallPercent = Math.floor(progress.progress);
                if (!isNaN(overallPercent) && overallPercent >= 0) {
                    text += `Общий прогресс: ${overallPercent}%\n`;
                    text += `${'▓'.repeat(Math.floor(overallPercent / 10))}${'░'.repeat(10 - Math.floor(overallPercent / 10))}\n\n`;
                }
            }
        }
        text += `🎯 *Система рангов:*\n`;
        text += `🪨 Камень: 0% бонус\n`;
        text += `🥉 Бронза: +${settings.bronze_bonus}% бонус\n`;
        text += `🥈 Серебро: +${settings.silver_bonus}% бонус\n`;
        text += `🥇 Золото: +${settings.gold_bonus}% бонус\n`;
        text += `💎 Платина: +${settings.platinum_bonus}% бонус (платная)\n\n`;
        if (userRank.current_rank === 'silver' || userRank.current_rank === 'gold') {
            text += `\n💡 Используй !premium_info для информации о Платиновой подписке`;
        }
        await this.sendMessage(chatId, text, await this.getReplyKeyboard());
    }
    async handlePremiumInfo(chatId, user) {
        if (await this.checkUserBlocked(user)) {
            await this.sendMessage(chatId, '🔒 *Ваш аккаунт заблокирован*\n\n' +
                'Ваш аккаунт был заблокирован администратором.\n\n' +
                'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
                '_Доступ к боту временно ограничен._');
            return;
        }
        const userRank = await this.ranksService.getUserRank(user.id);
        const settings = await this.ranksService.getSettings();
        if (userRank.current_rank === 'stone' || userRank.current_rank === 'bronze') {
            await this.sendMessage(chatId, '⚠️ *Платиновая подписка доступна с уровня Серебро.*\n\n' +
                'Продолжай выполнять задания и приглашать рефералов для повышения ранга!', await this.getReplyKeyboard(user?.tg_id));
            return;
        }
        let text = '🏆 *ПЛАТИНОВАЯ ПОДПИСКА*\n\n';
        text += '💎 *Преимущества:*\n';
        text += `• Бонус *+${settings.platinum_bonus}%* на все задания\n`;
        text += `• 👨‍💼 Персональный менеджер @${settings.manager_username}\n`;
        text += '• 📢 Закрытый канал с VIP-заданиями\n';
        text += '• ⚡ Приоритетная поддержка 24/7\n';
        text += '• 🎁 Расширенная реферальная программа\n\n';
        text += '💰 *Стоимость:*\n';
        text += `• ${settings.platinum_price_usd}$ с баланса (мгновенная активация)\n`;
        text += `• ${settings.platinum_price_rub} рублей на реквизиты\n`;
        text += `• ${settings.platinum_price_uah} гривен на реквизиты\n\n`;
        text += `📅 Длительность: ${settings.platinum_duration_days} дней\n\n`;
        if (userRank.current_rank !== 'gold' && userRank.current_rank !== 'platinum') {
            text += '🎯 *Доступно с уровня Золото*\n\n';
            const progress = await this.ranksService.getRankProgress(user.id);
            if (progress.nextRank === 'gold') {
                text += `Твой прогресс до Золота: ${Math.floor(progress.progress)}%\n`;
            }
        }
        else {
            text += '\n💎 Используй !upgrade для оформления подписки';
        }
        await this.sendMessage(chatId, text, await this.getReplyKeyboard());
    }
    async handleUpgrade(chatId, user) {
        const userRank = await this.ranksService.getUserRank(user.id);
        const settings = await this.ranksService.getSettings();
        if (userRank.current_rank !== 'gold' && userRank.current_rank !== 'platinum') {
            await this.sendMessage(chatId, '⚠️ *Платиновая подписка доступна только с уровня Золото*\n\n' +
                'Продолжай выполнять задания для повышения ранга!\n\n' +
                'Используй /rank чтобы посмотреть свой прогресс.', await this.getReplyKeyboard(user?.tg_id));
            return;
        }
        if (userRank.platinum_active && userRank.platinum_expires_at) {
            const daysLeft = Math.ceil((new Date(userRank.platinum_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            await this.sendMessage(chatId, `💎 *У тебя уже активна Платиновая подписка!*\n\n` +
                `⏰ Действует еще ${daysLeft} дней\n\n` +
                `Продление будет доступно за 3 дня до окончания.`, await this.getReplyKeyboard(user?.tg_id));
            return;
        }
        const progress = await this.ranksService.getRankProgress(user.id);
        let text = '🔍 *Проверяем твою статистику...*\n\n';
        text += `✅ Уровень: *${userRank.current_rank === 'gold' ? 'Золото' : 'Платина'}*\n`;
        text += `✅ Выполнено заданий: *${userRank.tasks_completed}*\n`;
        text += `✅ Рефералов: *${userRank.referrals_count}*\n\n`;
        text += '✨ *Ты соответствуешь требованиям для Платиновой подписки!*\n\n';
        text += '━━━━━━━━━━━━━━━━\n\n';
        text += '💳 *Выбери способ оплаты Платиновой подписки:*\n\n';
        text += `1️⃣ Оплата *${settings.platinum_price_usd}$* с баланса\n`;
        text += '   └ Мгновенная активация\n\n';
        text += `2️⃣ Оплата *${settings.platinum_price_rub} рублей* на реквизиты\n`;
        text += '   └ Активация после подтверждения менеджером\n\n';
        text += `3️⃣ Оплата *${settings.platinum_price_uah} гривен* на реквизиты\n`;
        text += '   └ Активация после подтверждения менеджером\n\n';
        text += '📝 Введи номер варианта (1/2/3):';
        await this.sendMessage(chatId, text);
    }
    async handlePaymentMethodChoice(chatId, user, choice) {
        const settings = await this.ranksService.getSettings();
        switch (choice) {
            case '1':
                const result = await this.premiumService.processBalancePayment(user.id);
                if (result.success) {
                    await this.sendMessage(chatId, `✅ *Оплата прошла успешно!*\n\n` +
                        `💎 Твоя Платиновая подписка активирована на ${settings.platinum_duration_days} дней\n\n` +
                        `🎁 *Твои преимущества:*\n` +
                        `• Бонус +${settings.platinum_bonus}% на все задания\n` +
                        `• Персональный менеджер: @${settings.manager_username}\n` +
                        `• Доступ к VIP-заданиям\n` +
                        `• Приоритетная поддержка\n\n` +
                        `Добро пожаловать в элиту! 🎉`, await this.getReplyKeyboard(user?.tg_id));
                }
                else {
                    await this.sendMessage(chatId, `❌ ${result.message}\n\n` +
                        `Пополни баланс или выбери оплату в рублях/гривнах.\n\n` +
                        `Используй !upgrade чтобы попробовать снова.`, await this.getReplyKeyboard(user?.tg_id));
                }
                break;
            case '2':
                const rubRequest = await this.premiumService.createRequest(user.id, 'rub_requisites');
                await this.sendMessage(chatId, `✅ *Отлично!*\n\n` +
                    `📝 Твой запрос №*${rubRequest.request_number}* принят.\n\n` +
                    `👨‍💼 Менеджер свяжется с тобой в этом же чате для отправки реквизитов в рублях.\n\n` +
                    `⏳ Ожидай сообщения в течение 10 минут!`, await this.getReplyKeyboard(user?.tg_id));
                break;
            case '3':
                const uahRequest = await this.premiumService.createRequest(user.id, 'uah_requisites');
                await this.sendMessage(chatId, `✅ *Отлично!*\n\n` +
                    `📝 Твой запрос №*${uahRequest.request_number}* принят.\n\n` +
                    `👨‍💼 Менеджер свяжется с тобой в этом же чате для отправки реквизитов в гривнах.\n\n` +
                    `⏳ Ожидай сообщения в течение 10 минут!`, await this.getReplyKeyboard(user?.tg_id));
                break;
            default:
                await this.sendMessage(chatId, '❌ Неверный выбор. Пожалуйста, введи 1, 2 или 3.\n\n' +
                    'Используй !upgrade чтобы попробовать снова.', await this.getReplyKeyboard(user?.tg_id));
        }
    }
};
exports.BotService = BotService;
exports.BotService = BotService = BotService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(button_entity_1.Button)),
    __param(2, (0, typeorm_1.InjectRepository)(task_entity_1.Task)),
    __param(3, (0, typeorm_1.InjectRepository)(user_task_entity_1.UserTask)),
    __param(4, (0, typeorm_1.InjectRepository)(scenario_entity_1.Scenario)),
    __param(5, (0, typeorm_1.InjectRepository)(balance_log_entity_1.BalanceLog)),
    __param(6, (0, typeorm_1.InjectRepository)(admin_entity_1.Admin)),
    __param(14, (0, common_1.Inject)((0, common_1.forwardRef)(() => commands_service_1.CommandsService))),
    __param(15, (0, common_1.Inject)((0, common_1.forwardRef)(() => ranks_service_1.RanksService))),
    __param(16, (0, common_1.Inject)((0, common_1.forwardRef)(() => premium_service_1.PremiumService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        config_1.ConfigService,
        fake_stats_service_1.FakeStatsService,
        settings_service_1.SettingsService,
        messages_service_1.MessagesService,
        users_service_1.UsersService,
        sync_service_1.SyncService,
        channels_service_1.ChannelsService,
        commands_service_1.CommandsService,
        ranks_service_1.RanksService,
        premium_service_1.PremiumService])
], BotService);
//# sourceMappingURL=bot.service.js.map