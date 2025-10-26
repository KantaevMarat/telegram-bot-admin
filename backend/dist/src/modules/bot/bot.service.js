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
const fake_stats_service_1 = require("../stats/fake-stats.service");
const settings_service_1 = require("../settings/settings.service");
const messages_service_1 = require("../messages/messages.service");
const users_service_1 = require("../users/users.service");
let BotService = BotService_1 = class BotService {
    constructor(userRepo, buttonRepo, taskRepo, userTaskRepo, scenarioRepo, configService, fakeStatsService, settingsService, messagesService, usersService) {
        this.userRepo = userRepo;
        this.buttonRepo = buttonRepo;
        this.taskRepo = taskRepo;
        this.userTaskRepo = userTaskRepo;
        this.scenarioRepo = scenarioRepo;
        this.configService = configService;
        this.fakeStatsService = fakeStatsService;
        this.settingsService = settingsService;
        this.messagesService = messagesService;
        this.usersService = usersService;
        this.logger = new common_1.Logger(BotService_1.name);
        this.botToken = '';
        this.logger.log('BotService constructor called');
        this.botToken = this.configService.get('TELEGRAM_BOT_TOKEN') || '';
        this.logger.log(`Bot token loaded: ${this.botToken ? 'YES' : 'NO'}`);
        this.logger.log(`Bot token preview: ${this.botToken ? this.botToken.substring(0, 10) + '...' : 'EMPTY'}`);
        if (!this.botToken) {
            this.logger.error('TELEGRAM_BOT_TOKEN is not set!');
        }
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
    async handleMessage(message) {
        const chatId = message.chat.id.toString();
        const text = message.text;
        let user = await this.userRepo.findOne({ where: { tg_id: chatId } });
        const isNewUser = !user;
        if (!user) {
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
        if (user.status === 'blocked') {
            await this.sendMessage(chatId, 'Ваш аккаунт заблокирован.');
            return;
        }
        if (text?.startsWith('/')) {
            await this.handleCommand(chatId, text, user);
        }
        else if (text?.startsWith('wallet ')) {
            await this.handleWithdrawalRequest(chatId, user, text);
        }
        else {
            const scenario = await this.findMatchingScenario(text);
            if (scenario) {
                await this.handleScenario(chatId, user, scenario);
            }
            else {
                await this.messagesService.createUserMessage(user.id, text);
                await this.sendMessage(chatId, 'Спасибо за ваше сообщение! Администратор скоро ответит.');
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
                const refBonus = await this.settingsService.getValue('ref_bonus', '10');
                const bonusAmount = 5;
                referrer.balance_usdt = parseFloat(referrer.balance_usdt.toString()) + bonusAmount;
                await this.userRepo.save(referrer);
                this.logger.log(`Referral bonus ${bonusAmount} USDT given to user ${referrerTgId}`);
            }
        }
        catch (error) {
            this.logger.error('Error giving referral bonus:', error);
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
        const fakeStats = await this.fakeStatsService.getLatestFakeStats();
        const greetingTemplate = await this.settingsService.getValue('greeting_template', 'Default welcome message');
        let text = greetingTemplate;
        if (fakeStats) {
            text = text
                .replace('{fake.online}', fakeStats.online.toString())
                .replace('{fake.active}', fakeStats.active.toString())
                .replace('{fake.paid}', fakeStats.paid_usdt.toString())
                .replace('{username}', user.username || user.first_name || 'Friend')
                .replace('{balance}', user.balance_usdt.toString());
        }
        await this.sendMessage(chatId, text, await this.getMainKeyboard());
    }
    async handleCommand(chatId, command, user) {
        const cmd = command.split(' ')[0];
        switch (cmd) {
            case '/start':
                await this.sendWelcomeMessage(chatId, user);
                break;
            case '/balance':
                await this.sendBalance(chatId, user);
                break;
            case '/tasks':
                await this.sendAvailableTasks(chatId, user);
                break;
            case '/profile':
                await this.sendProfile(chatId, user);
                break;
            case '/referral':
                await this.sendReferralInfo(chatId, user);
                break;
            case '/menu':
                await this.sendMessage(chatId, 'Главное меню:', await this.getMainKeyboard());
                break;
            case '/help':
                await this.sendHelp(chatId);
                break;
            default:
                await this.sendMessage(chatId, 'Неизвестная команда. Используйте /help для списка команд.');
        }
    }
    async sendHelp(chatId) {
        const text = `📖 *Доступные команды:*\n\n` +
            `/start - Главное меню\n` +
            `/balance - Проверить баланс\n` +
            `/tasks - Список заданий\n` +
            `/profile - Ваш профиль\n` +
            `/referral - Реферальная программа\n` +
            `/menu - Главное меню\n` +
            `/help - Эта справка`;
        await this.sendMessage(chatId, text);
    }
    async sendAvailableTasks(chatId, user) {
        const tasks = await this.taskRepo.find({ where: { active: true } });
        if (tasks.length === 0) {
            await this.sendMessage(chatId, 'На данный момент нет доступных заданий.', {
                inline_keyboard: [[{ text: '🔙 Главное меню', callback_data: 'menu' }]],
            });
            return;
        }
        const completedTotal = await this.userTaskRepo.count({
            where: { user_id: user.id, status: 'completed' },
        });
        let message = `📋 *Доступные задания*\n\n` +
            `✅ Выполнено: ${completedTotal} заданий\n` +
            `💰 Заработано: ${user.total_earned} USDT\n\n` +
            `Выберите задание:`;
        const keyboard = [];
        for (const task of tasks) {
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
        await this.answerCallbackQuery(callback.id, '⏳ Обработка...');
        const user = await this.userRepo.findOne({ where: { tg_id: tgId } });
        if (!user) {
            await this.sendMessage(chatId, 'Пользователь не найден. Используйте /start');
            return;
        }
        if (data === 'tasks') {
            await this.sendAvailableTasks(chatId, user);
        }
        else if (data === 'my_tasks') {
            await this.showMyTasks(chatId, user);
        }
        else if (data === 'balance') {
            await this.sendBalance(chatId, user);
        }
        else if (data === 'profile') {
            await this.sendProfile(chatId, user);
        }
        else if (data === 'withdraw') {
            await this.sendWithdrawInfo(chatId, user);
        }
        else if (data === 'referral') {
            await this.sendReferralInfo(chatId, user);
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
        else if (data === 'noop') {
            return;
        }
        else if (data.startsWith('verify_')) {
            await this.handleTaskVerification(chatId, user, data);
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
            const webAppUrl = await this.settingsService.getValue('web_app_url', 'https://your-app-url.com');
            keyboard.push([
                { text: '📋 Задания', callback_data: 'tasks' },
                { text: '💰 Баланс', callback_data: 'balance' },
            ]);
            keyboard.push([
                { text: '👤 Профиль', callback_data: 'profile' },
                { text: '👥 Рефералы', callback_data: 'referral' },
            ]);
            keyboard.push([
                {
                    text: '🌐 Открыть приложение',
                    web_app: { url: webAppUrl },
                },
            ]);
        }
        return {
            inline_keyboard: keyboard,
        };
    }
    async sendMessage(chatId, text, replyMarkup) {
        const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
        try {
            await axios_1.default.post(url, {
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
                reply_markup: replyMarkup,
            });
        }
        catch (error) {
            this.logger.error(`Failed to send message to ${chatId}:`, error.message);
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
    async sendBalance(chatId, user) {
        const text = `💰 *Ваш баланс*\n\n` +
            `💵 Доступно: ${user.balance_usdt} USDT\n` +
            `📊 Всего заработано: ${user.total_earned} USDT\n` +
            `✅ Выполнено заданий: ${user.tasks_completed}\n\n` +
            `Используйте кнопку "Вывод средств" для вывода`;
        const keyboard = {
            inline_keyboard: [
                [{ text: '💸 Вывести средства', callback_data: 'withdraw' }],
                [{ text: '🔙 Назад', callback_data: 'menu' }],
            ],
        };
        await this.sendMessage(chatId, text, keyboard);
    }
    async sendProfile(chatId, user) {
        const refCount = await this.userRepo.count({
            where: { referred_by: user.id },
        });
        const text = `👤 *Ваш профиль*\n\n` +
            `🆔 ID: ${user.tg_id}\n` +
            `👤 Имя: ${user.first_name || 'Не указано'}\n` +
            `📱 Username: @${user.username || 'не указан'}\n` +
            `💰 Баланс: ${user.balance_usdt} USDT\n` +
            `✅ Заданий выполнено: ${user.tasks_completed}\n` +
            `👥 Рефералов: ${refCount}\n` +
            `📅 Регистрация: ${new Date(user.registered_at).toLocaleDateString('ru-RU')}`;
        const keyboard = {
            inline_keyboard: [
                [{ text: '👥 Реферальная программа', callback_data: 'referral' }],
                [{ text: '🔙 Назад', callback_data: 'menu' }],
            ],
        };
        await this.sendMessage(chatId, text, keyboard);
    }
    async sendWithdrawInfo(chatId, user) {
        const minWithdraw = await this.settingsService.getValue('min_withdraw', '10');
        if (parseFloat(user.balance_usdt.toString()) < parseFloat(minWithdraw)) {
            await this.sendMessage(chatId, `❌ Недостаточно средств для вывода.\n\nМинимальная сумма: ${minWithdraw} USDT\nВаш баланс: ${user.balance_usdt} USDT`);
            return;
        }
        const text = `💸 *Вывод средств*\n\n` +
            `Ваш баланс: ${user.balance_usdt} USDT\n` +
            `Минимум для вывода: ${minWithdraw} USDT\n\n` +
            `Отправьте адрес кошелька USDT (TRC20) для вывода средств.\n\n` +
            `Формат: wallet YOUR_WALLET_ADDRESS AMOUNT\n` +
            `Пример: wallet TXxxx...xxx 50`;
        await this.sendMessage(chatId, text);
    }
    async sendReferralInfo(chatId, user) {
        const refCount = await this.userRepo.count({
            where: { referred_by: user.id },
        });
        const refBonus = await this.settingsService.getValue('ref_bonus', '10');
        const botUsername = await this.settingsService.getValue('bot_username', 'yourbot');
        const refLink = `https://t.me/${botUsername}?start=ref${user.tg_id}`;
        const text = `👥 *Реферальная программа*\n\n` +
            `Приглашайте друзей и получайте ${refBonus}% от их заработка!\n\n` +
            `📊 Ваша статистика:\n` +
            `👥 Приглашено: ${refCount} человек\n\n` +
            `🔗 Ваша реферальная ссылка:\n` +
            `${refLink}\n\n` +
            `Делитесь ссылкой с друзьями!`;
        const keyboard = {
            inline_keyboard: [
                [
                    {
                        text: '📤 Поделиться ссылкой',
                        url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Присоединяйся к боту и зарабатывай!')}`,
                    },
                ],
                [{ text: '🔙 Назад', callback_data: 'menu' }],
            ],
        };
        await this.sendMessage(chatId, text, keyboard);
    }
    async handleTaskAction(chatId, user, data) {
        const taskId = data.replace('task_', '');
        const task = await this.taskRepo.findOne({ where: { id: taskId } });
        if (!task || !task.active) {
            await this.sendMessage(chatId, '❌ Задание недоступно', {
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
        const taskId = data.replace('start_task_', '');
        const task = await this.taskRepo.findOne({ where: { id: taskId } });
        if (!task || !task.active) {
            await this.sendMessage(chatId, '❌ Задание недоступно');
            return;
        }
        const userTask = this.userTaskRepo.create({
            user_id: user.id,
            task_id: task.id,
            status: 'in_progress',
            started_at: new Date(),
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
        const taskId = data.replace('submit_task_', '');
        const task = await this.taskRepo.findOne({ where: { id: taskId } });
        if (!task || !task.active) {
            await this.sendMessage(chatId, '❌ Задание недоступно');
            return;
        }
        const userTask = await this.userTaskRepo.findOne({
            where: { user_id: user.id, task_id: task.id, status: 'in_progress' },
        });
        if (!userTask) {
            await this.sendMessage(chatId, '❌ Задание не найдено. Начните его выполнение заново.');
            return;
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
        const reward = Math.floor(Math.random() * (task.reward_max - task.reward_min + 1)) + task.reward_min;
        const requiresManualReview = task.reward_max > 50;
        if (requiresManualReview) {
            userTask.status = 'submitted';
            userTask.reward = reward;
            userTask.submitted_at = new Date();
            await this.userTaskRepo.save(userTask);
            await this.sendMessage(chatId, `⏳ *Задание отправлено на проверку!*\n\n` +
                `📋 ${task.title}\n` +
                `💰 Потенциальная награда: ${reward} USDT\n\n` +
                `Администратор проверит выполнение в ближайшее время. ` +
                `Вы получите уведомление о результатах проверки.`, {
                inline_keyboard: [[{ text: '🔙 К заданиям', callback_data: 'tasks' }]],
            });
        }
        else {
            userTask.status = 'completed';
            userTask.reward = reward;
            userTask.completed_at = new Date();
            await this.userTaskRepo.save(userTask);
            user.balance_usdt = parseFloat(user.balance_usdt.toString()) + reward;
            user.total_earned = parseFloat(user.total_earned.toString()) + reward;
            user.tasks_completed = user.tasks_completed + 1;
            await this.userRepo.save(user);
            await this.sendMessage(chatId, `✅ *Задание выполнено!*\n\n` +
                `📋 ${task.title}\n` +
                `💰 Получено: +${reward} USDT\n\n` +
                `Ваш баланс: ${user.balance_usdt} USDT`, {
                inline_keyboard: [
                    [{ text: '📋 Другие задания', callback_data: 'tasks' }],
                    [{ text: '💰 Мой баланс', callback_data: 'balance' }],
                ],
            });
        }
    }
    async cancelTask(chatId, user, data) {
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
        let text = 'Информация';
        let keyboard = { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'menu' }]] };
        if (button.action_type === 'command' && button.action_payload?.command) {
            const command = button.action_payload.command;
            switch (command) {
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
                    text =
                        `ℹ️ *Информация*\n\n` + `Команда: ${command}\n` + `Эта функция находится в разработке.`;
            }
        }
        else if (button.action_type === 'send_message' && button.action_payload?.text) {
            text = button.action_payload.text;
            text = text
                .replace('{username}', user.username || user.first_name || 'Friend')
                .replace('{balance}', user.balance_usdt.toString())
                .replace('{tasks_completed}', user.tasks_completed.toString());
        }
        else if (button.action_type === 'open_url' && button.action_payload?.url) {
            text = button.action_payload?.text || 'Перейдите по ссылке ниже';
            keyboard = {
                inline_keyboard: [
                    [{ text: '🔗 Перейти', url: button.action_payload.url }],
                    [{ text: '🔙 Назад', callback_data: 'menu' }],
                ],
            };
        }
        await this.sendMessage(chatId, text, keyboard);
    }
    async handleTaskVerification(chatId, user, data) {
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
        user.balance_usdt = parseFloat(user.balance_usdt.toString()) + reward;
        user.total_earned = parseFloat(user.total_earned.toString()) + reward;
        user.tasks_completed = user.tasks_completed + 1;
        await this.userRepo.save(user);
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
    }
    async handleWithdrawalRequest(chatId, user, text) {
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
        const minWithdraw = parseFloat(await this.settingsService.getValue('min_withdraw', '10'));
        const maxWithdraw = parseFloat(await this.settingsService.getValue('max_withdraw', '10000'));
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
        const scenarios = await this.scenarioRepo.find({
            where: { is_active: true },
        });
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
        try {
            if (scenario.response) {
                let text = scenario.response;
                text = text
                    .replace(/{username}/g, user.username || user.first_name || 'Friend')
                    .replace(/{first_name}/g, user.first_name || 'Friend')
                    .replace(/{balance}/g, user.balance_usdt.toString())
                    .replace(/{tasks_completed}/g, user.tasks_completed.toString())
                    .replace(/{total_earned}/g, user.total_earned.toString());
                await this.sendMessage(chatId, text);
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
    async checkChannelSubscription(userId, channelId) {
        try {
            const response = await axios_1.default.get(`https://api.telegram.org/bot${this.botToken}/getChatMember`, {
                params: {
                    chat_id: channelId,
                    user_id: userId,
                },
            });
            if (response.data.ok) {
                const status = response.data.result.status;
                const isSubscribed = ['creator', 'administrator', 'member'].includes(status);
                this.logger.log(`Subscription check: user ${userId}, channel ${channelId}, status ${status}, subscribed: ${isSubscribed}`);
                return isSubscribed;
            }
            this.logger.warn(`Failed to check subscription: ${response.data.description || 'Unknown error'}`);
            return false;
        }
        catch (error) {
            this.logger.error(`Error checking channel subscription:`, error.response?.data || error.message);
            return false;
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
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        config_1.ConfigService,
        fake_stats_service_1.FakeStatsService,
        settings_service_1.SettingsService,
        messages_service_1.MessagesService,
        users_service_1.UsersService])
], BotService);
//# sourceMappingURL=bot.service.js.map