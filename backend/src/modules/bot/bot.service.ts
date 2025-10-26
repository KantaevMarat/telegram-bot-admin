import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { User } from '../../entities/user.entity';
import { Button } from '../../entities/button.entity';
import { Task } from '../../entities/task.entity';
import { UserTask } from '../../entities/user-task.entity';
import { Scenario } from '../../entities/scenario.entity';
import { FakeStatsService } from '../stats/fake-stats.service';
import { SettingsService } from '../settings/settings.service';
import { MessagesService } from '../messages/messages.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private botToken: string = '';

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Button)
    private buttonRepo: Repository<Button>,
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    @InjectRepository(UserTask)
    private userTaskRepo: Repository<UserTask>,
    @InjectRepository(Scenario)
    private scenarioRepo: Repository<Scenario>,
    private configService: ConfigService,
    private fakeStatsService: FakeStatsService,
    private settingsService: SettingsService,
    private messagesService: MessagesService,
    private usersService: UsersService,
  ) {
    this.logger.log('BotService constructor called');
    this.botToken = this.configService.get('TELEGRAM_BOT_TOKEN') || '';
    this.logger.log(`Bot token loaded: ${this.botToken ? 'YES' : 'NO'}`);
    this.logger.log(
      `Bot token preview: ${this.botToken ? this.botToken.substring(0, 10) + '...' : 'EMPTY'}`,
    );

    if (!this.botToken) {
      this.logger.error('TELEGRAM_BOT_TOKEN is not set!');
    }
  }

  async handleWebhook(update: any) {
    try {
      if (update.message) {
        await this.handleMessage(update.message);
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
      }
    } catch (error) {
      this.logger.error('Error handling webhook:', error);
    }
  }

  private async handleMessage(message: any) {
    const chatId = message.chat.id.toString();
    const text = message.text;

    // Get or create user
    let user = await this.userRepo.findOne({ where: { tg_id: chatId } });
    const isNewUser = !user;

    if (!user) {
      // Extract referral code from /start command
      let refBy: string | undefined;
      if (text?.startsWith('/start ref')) {
        refBy = text.replace('/start ref', '').trim();
      }

      user = await this.createUser(message.from, refBy);
      await this.sendWelcomeMessage(chatId, user);

      // Notify referrer
      if (refBy && refBy !== chatId) {
        await this.notifyReferrer(refBy);
      }
      return;
    }

    // Check for blocked user
    if (user.status === 'blocked') {
      await this.sendMessage(chatId, 'Ваш аккаунт заблокирован.');
      return;
    }

    // Handle commands
    if (text?.startsWith('/')) {
      await this.handleCommand(chatId, text, user);
    } else if (text?.startsWith('wallet ')) {
      // Handle withdrawal request
      await this.handleWithdrawalRequest(chatId, user, text);
    } else {
      // Check for scenarios
      const scenario = await this.findMatchingScenario(text);
      if (scenario) {
        await this.handleScenario(chatId, user, scenario);
      } else {
        // Save user message
        await this.messagesService.createUserMessage(user.id, text);
        await this.sendMessage(chatId, 'Спасибо за ваше сообщение! Администратор скоро ответит.');
      }
    }
  }

  private async createUser(from: any, refBy?: string) {
    // Find referrer by tg_id if provided
    let referrerId: string | undefined;
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

    // Give bonus to referrer if applicable
    if (refBy) {
      await this.giveReferralBonus(refBy);
    }

    return savedUser;
  }

  private async giveReferralBonus(referrerTgId: string) {
    try {
      const referrer = await this.userRepo.findOne({ where: { tg_id: referrerTgId } });
      if (referrer) {
        const refBonus = await this.settingsService.getValue('ref_bonus', '10');
        const bonusAmount = 5; // Fixed bonus for new referral

        referrer.balance_usdt = parseFloat(referrer.balance_usdt.toString()) + bonusAmount;
        await this.userRepo.save(referrer);

        this.logger.log(`Referral bonus ${bonusAmount} USDT given to user ${referrerTgId}`);
      }
    } catch (error) {
      this.logger.error('Error giving referral bonus:', error);
    }
  }

  private async notifyReferrer(referrerTgId: string) {
    try {
      await this.sendMessage(referrerTgId, '🎉 У вас новый реферал! Вы получили бонус 5 USDT.');
    } catch (error) {
      this.logger.error('Error notifying referrer:', error);
    }
  }

  private async sendWelcomeMessage(chatId: string, user: User) {
    const fakeStats = await this.fakeStatsService.getLatestFakeStats();

    const greetingTemplate = await this.settingsService.getValue(
      'greeting_template',
      'Default welcome message',
    );

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

  private async handleCommand(chatId: string, command: string, user: User) {
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

  private async sendHelp(chatId: string) {
    const text =
      `📖 *Доступные команды:*\n\n` +
      `/start - Главное меню\n` +
      `/balance - Проверить баланс\n` +
      `/tasks - Список заданий\n` +
      `/profile - Ваш профиль\n` +
      `/referral - Реферальная программа\n` +
      `/menu - Главное меню\n` +
      `/help - Эта справка`;

    await this.sendMessage(chatId, text);
  }

  private async sendAvailableTasks(chatId: string, user: User) {
    const tasks = await this.taskRepo.find({ where: { active: true } });

    if (tasks.length === 0) {
      await this.sendMessage(chatId, 'На данный момент нет доступных заданий.');
      return;
    }

    let message = '📋 Доступные задания:\n\n';
    for (const task of tasks) {
      const completed = await this.userTaskRepo.count({
        where: { user_id: user.id, task_id: task.id },
      });

      if (completed < task.max_per_user) {
        message += `🔹 ${task.title}\n`;
        message += `   ${task.description}\n`;
        message += `   💰 Награда: ${task.reward_min}-${task.reward_max} USDT\n\n`;
      }
    }

    await this.sendMessage(chatId, message);
  }

  private async handleCallbackQuery(callback: any) {
    const chatId = callback.message.chat.id.toString();
    const data = callback.data;
    const tgId = callback.from.id.toString();

    // Answer callback to remove loading state
    await this.answerCallbackQuery(callback.id, '⏳ Обработка...');

    const user = await this.userRepo.findOne({ where: { tg_id: tgId } });
    if (!user) {
      await this.sendMessage(chatId, 'Пользователь не найден. Используйте /start');
      return;
    }

    // Handle different button actions
    if (data === 'tasks') {
      await this.sendAvailableTasks(chatId, user);
    } else if (data === 'balance') {
      await this.sendBalance(chatId, user);
    } else if (data === 'profile') {
      await this.sendProfile(chatId, user);
    } else if (data === 'withdraw') {
      await this.sendWithdrawInfo(chatId, user);
    } else if (data === 'referral') {
      await this.sendReferralInfo(chatId, user);
    } else if (data.startsWith('task_')) {
      await this.handleTaskAction(chatId, user, data);
    } else if (data.startsWith('verify_')) {
      await this.handleTaskVerification(chatId, user, data);
    } else if (data === 'menu') {
      await this.sendWelcomeMessage(chatId, user);
    } else {
      // Check if it's a custom button from DB
      const button = await this.buttonRepo.findOne({ where: { id: data } });
      if (button) {
        await this.handleCustomButton(chatId, user, button);
      }
    }
  }

  private async getMainKeyboard() {
    const buttons = await this.buttonRepo.find({
      where: { active: true },
      order: { row: 'ASC', col: 'ASC' },
    });

    const keyboard: any[] = [];
    const rows: any = {};

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

    // Add Web App button if no custom buttons
    if (keyboard.length === 0) {
      const webAppUrl = await this.settingsService.getValue(
        'web_app_url',
        'https://your-app-url.com',
      );
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

  async sendMessage(chatId: string, text: string, replyMarkup?: any) {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    try {
      await axios.post(url, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
    } catch (error) {
      this.logger.error(`Failed to send message to ${chatId}:`, error.message);
    }
  }

  private async answerCallbackQuery(callbackQueryId: string, text?: string) {
    const url = `https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`;

    try {
      await axios.post(url, {
        callback_query_id: callbackQueryId,
        text,
      });
    } catch (error) {
      this.logger.error('Failed to answer callback query:', error.message);
    }
  }

  async setWebhook(webhookUrl: string) {
    const url = `https://api.telegram.org/bot${this.botToken}/setWebhook`;

    try {
      const response = await axios.post(url, {
        url: webhookUrl,
      });
      this.logger.log(`Webhook set to: ${webhookUrl}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to set webhook:', error);
      throw error;
    }
  }

  // === NEW METHODS ===

  private async sendBalance(chatId: string, user: User) {
    const text =
      `💰 *Ваш баланс*\n\n` +
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

  private async sendProfile(chatId: string, user: User) {
    const refCount = await this.userRepo.count({
      where: { referred_by: user.id },
    });

    const text =
      `👤 *Ваш профиль*\n\n` +
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

  private async sendWithdrawInfo(chatId: string, user: User) {
    const minWithdraw = await this.settingsService.getValue('min_withdraw', '10');

    if (parseFloat(user.balance_usdt.toString()) < parseFloat(minWithdraw)) {
      await this.sendMessage(
        chatId,
        `❌ Недостаточно средств для вывода.\n\nМинимальная сумма: ${minWithdraw} USDT\nВаш баланс: ${user.balance_usdt} USDT`,
      );
      return;
    }

    const text =
      `💸 *Вывод средств*\n\n` +
      `Ваш баланс: ${user.balance_usdt} USDT\n` +
      `Минимум для вывода: ${minWithdraw} USDT\n\n` +
      `Отправьте адрес кошелька USDT (TRC20) для вывода средств.\n\n` +
      `Формат: wallet YOUR_WALLET_ADDRESS AMOUNT\n` +
      `Пример: wallet TXxxx...xxx 50`;

    await this.sendMessage(chatId, text);
  }

  private async sendReferralInfo(chatId: string, user: User) {
    const refCount = await this.userRepo.count({
      where: { referred_by: user.id },
    });

    const refBonus = await this.settingsService.getValue('ref_bonus', '10');
    const botUsername = await this.settingsService.getValue('bot_username', 'yourbot');
    const refLink = `https://t.me/${botUsername}?start=ref${user.tg_id}`;

    const text =
      `👥 *Реферальная программа*\n\n` +
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

  private async handleTaskAction(chatId: string, user: User, data: string) {
    const taskId = data.replace('task_', '');
    const task = await this.taskRepo.findOne({ where: { id: taskId } });

    if (!task || !task.active) {
      await this.sendMessage(chatId, '❌ Задание недоступно');
      return;
    }

    // Check if user already completed this task
    const existingUserTask = await this.userTaskRepo.findOne({
      where: { user_id: user.id, task_id: task.id },
    });

    if (existingUserTask && existingUserTask.status === 'completed') {
      const completedCount = await this.userTaskRepo.count({
        where: { user_id: user.id, task_id: task.id, status: 'completed' },
      });

      if (completedCount >= task.max_per_user) {
        await this.sendMessage(
          chatId,
          '✅ Вы уже выполнили это задание максимальное количество раз',
        );
        return;
      }
    }

    // Check how many times user did this task
    const completedCount = await this.userTaskRepo.count({
      where: { user_id: user.id, task_id: task.id },
    });

    if (completedCount >= task.max_per_user) {
      await this.sendMessage(chatId, '✅ Вы уже выполнили это задание максимальное количество раз');
      return;
    }

    // Calculate reward
    const reward =
      Math.floor(Math.random() * (task.reward_max - task.reward_min + 1)) + task.reward_min;

    const text =
      `📋 *${task.title}*\n\n` +
      `${task.description}\n\n` +
      `💰 Награда: ${reward} USDT\n\n` +
      `${task.action_url ? `🔗 Ссылка: ${task.action_url}\n\n` : ''}` +
      `Выполните задание и нажмите кнопку ниже для проверки.`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '✅ Я выполнил задание', callback_data: `verify_${task.id}_${reward}` }],
        [{ text: '🔙 К заданиям', callback_data: 'tasks' }],
      ],
    };

    await this.sendMessage(chatId, text, keyboard);
  }

  private async handleCustomButton(chatId: string, user: User, button: Button) {
    // Handle custom button from database based on action_type
    let text = 'Информация';
    let keyboard: any = { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'menu' }]] };

    if (button.action_type === 'command' && button.action_payload?.command) {
      // Handle command buttons
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
          return; // sendBalance already sends message
        case 'tasks':
          await this.sendAvailableTasks(chatId, user);
          return; // sendAvailableTasks already sends message
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
          return; // sendReferralInfo already sends message
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
    } else if (button.action_type === 'send_message' && button.action_payload?.text) {
      text = button.action_payload.text;
      text = text
        .replace('{username}', user.username || user.first_name || 'Friend')
        .replace('{balance}', user.balance_usdt.toString())
        .replace('{tasks_completed}', user.tasks_completed.toString());
    } else if (button.action_type === 'open_url' && button.action_payload?.url) {
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

  private async handleTaskVerification(chatId: string, user: User, data: string) {
    // Parse: verify_taskId_reward
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

    // Check if user already completed this task too many times
    const completedCount = await this.userTaskRepo.count({
      where: { user_id: user.id, task_id: taskId },
    });

    if (completedCount >= task.max_per_user) {
      await this.sendMessage(chatId, '✅ Вы уже выполнили это задание максимальное количество раз');
      return;
    }

    // Create user task record
    const userTask = this.userTaskRepo.create({
      user_id: user.id,
      task_id: taskId,
      reward_received: reward,
      status: 'completed',
    });

    await this.userTaskRepo.save(userTask);

    // Update user balance
    user.balance_usdt = parseFloat(user.balance_usdt.toString()) + reward;
    user.total_earned = parseFloat(user.total_earned.toString()) + reward;
    user.tasks_completed = user.tasks_completed + 1;
    await this.userRepo.save(user);

    const text =
      `✅ *Задание выполнено!*\n\n` +
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

  private async handleWithdrawalRequest(chatId: string, user: User, text: string) {
    // Parse: wallet TXxxxxx 50
    const parts = text.split(' ');

    if (parts.length < 3) {
      await this.sendMessage(
        chatId,
        '❌ Неверный формат. Используйте:\nwallet YOUR_WALLET_ADDRESS AMOUNT\nПример: wallet TXxxx...xxx 50',
      );
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
      await this.sendMessage(
        chatId,
        `❌ Недостаточно средств. Ваш баланс: ${user.balance_usdt} USDT`,
      );
      return;
    }

    // Validate TRC20 address (basic check)
    if (!walletAddress.startsWith('T') || walletAddress.length !== 34) {
      await this.sendMessage(
        chatId,
        '❌ Неверный формат адреса кошелька TRC20 (должен начинаться с T и иметь 34 символа)',
      );
      return;
    }

    try {
      // Create payout request
      await this.usersService.createPayoutRequest(user, amount, walletAddress);

      await this.sendMessage(
        chatId,
        `✅ *Заявка на вывод создана!*\n\n` +
          `💰 Сумма: ${amount} USDT\n` +
          `💳 Кошелёк: ${walletAddress}\n\n` +
          `⏳ Ваша заявка будет обработана в течение 24 часов.\n` +
          `Вы получите уведомление после обработки.`,
      );

      this.logger.log(
        `Withdrawal request created: user ${user.tg_id}, amount ${amount} USDT, wallet ${walletAddress}`,
      );
    } catch (error) {
      this.logger.error('Error creating withdrawal request:', error);
      await this.sendMessage(chatId, '❌ Ошибка при создании заявки. Попробуйте позже.');
    }
  }

  private async findMatchingScenario(text: string): Promise<Scenario | null> {
    if (!text) return null;

    // Get all active scenarios
    const scenarios = await this.scenarioRepo.find({
      where: { is_active: true },
    });

    // Find matching scenario (case-insensitive)
    const textLower = text.toLowerCase().trim();

    for (const scenario of scenarios) {
      const triggerLower = scenario.trigger.toLowerCase().trim();

      // Exact match
      if (textLower === triggerLower) {
        return scenario;
      }

      // Contains match (for phrases like "привет" matching "привет!" or "Привет, как дела?")
      if (textLower.includes(triggerLower) || triggerLower.includes(textLower)) {
        return scenario;
      }
    }

    return null;
  }

  private async handleScenario(chatId: string, user: User, scenario: Scenario) {
    try {
      // Simple scenario with text response
      if (scenario.response) {
        let text = scenario.response;

        // Replace variables
        text = text
          .replace(/{username}/g, user.username || user.first_name || 'Friend')
          .replace(/{first_name}/g, user.first_name || 'Friend')
          .replace(/{balance}/g, user.balance_usdt.toString())
          .replace(/{tasks_completed}/g, user.tasks_completed.toString())
          .replace(/{total_earned}/g, user.total_earned.toString());

        await this.sendMessage(chatId, text);
        return;
      }

      // Advanced scenario with steps
      if (scenario.steps && Array.isArray(scenario.steps)) {
        for (const step of scenario.steps) {
          if (step.type === 'message' && step.text) {
            let text = step.text;

            // Replace variables
            text = text
              .replace(/{username}/g, user.username || user.first_name || 'Friend')
              .replace(/{first_name}/g, user.first_name || 'Friend')
              .replace(/{balance}/g, user.balance_usdt.toString())
              .replace(/{tasks_completed}/g, user.tasks_completed.toString())
              .replace(/{total_earned}/g, user.total_earned.toString());

            await this.sendMessage(chatId, text, step.keyboard);
          } else if (step.type === 'delay' && step.ms) {
            // Delay between messages
            await new Promise((resolve) => setTimeout(resolve, step.ms));
          }
        }
      }

      this.logger.log(`Scenario "${scenario.name}" executed for user ${user.tg_id}`);
    } catch (error) {
      this.logger.error(`Error executing scenario "${scenario.name}":`, error);
      await this.sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
    }
  }
}
