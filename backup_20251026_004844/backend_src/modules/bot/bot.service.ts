import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { User } from '../../entities/user.entity';
import { Button } from '../../entities/button.entity';
import { Task } from '../../entities/task.entity';
import { UserTask } from '../../entities/user-task.entity';
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
    private configService: ConfigService,
    private fakeStatsService: FakeStatsService,
    private settingsService: SettingsService,
    private messagesService: MessagesService,
    private usersService: UsersService,
  ) {
    this.botToken = this.configService.get('TELEGRAM_BOT_TOKEN') || '';
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
    if (!user) {
      user = await this.createUser(message.from);
      await this.sendWelcomeMessage(chatId, user);
    }

    // Check for blocked user
    if (user.status === 'blocked') {
      await this.sendMessage(chatId, 'Ваш аккаунт заблокирован.');
      return;
    }

    // Handle commands
    if (text?.startsWith('/')) {
      await this.handleCommand(chatId, text, user);
    } else {
      // Save user message
      await this.messagesService.createUserMessage(user.id, text);
      await this.sendMessage(chatId, 'Спасибо за ваше сообщение! Администратор скоро ответит.');
    }
  }

  private async createUser(from: any) {
    const user = this.userRepo.create({
      tg_id: from.id.toString(),
      username: from.username,
      first_name: from.first_name,
      last_name: from.last_name,
      status: 'active',
      balance_usdt: 0,
    });

    return await this.userRepo.save(user);
  }

  private async sendWelcomeMessage(chatId: string, user: User) {
    const fakeStats = await this.fakeStatsService.getLatestFakeStats();

    const greetingTemplate = await this.settingsService.getValue(
      'greeting_template', 
      'Default welcome message'
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
    switch (command) {
      case '/start':
        await this.sendWelcomeMessage(chatId, user);
        break;

      case '/balance':
        await this.sendMessage(
          chatId,
          `💰 Ваш баланс: ${user.balance_usdt} USDT\n📊 Заработано всего: ${user.total_earned} USDT\n✅ Выполнено заданий: ${user.tasks_completed}`,
        );
        break;

      case '/tasks':
        await this.sendAvailableTasks(chatId, user);
        break;

      case '/menu':
        await this.sendMessage(chatId, 'Главное меню:', await this.getMainKeyboard());
        break;

      default:
        await this.sendMessage(chatId, 'Неизвестная команда. Используйте /menu для главного меню.');
    }
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

    // Answer callback to remove loading state
    await this.answerCallbackQuery(callback.id);

    // Handle button action based on data
    // Implementation depends on button actions
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

    return {
      inline_keyboard: keyboard.length > 0 ? keyboard : [[{ text: '📋 Задания', callback_data: 'tasks' }]],
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
}

