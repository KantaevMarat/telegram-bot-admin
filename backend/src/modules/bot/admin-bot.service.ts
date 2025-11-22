import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Admin } from '../../entities/admin.entity';

@Injectable()
export class AdminBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdminBotService.name);
  private botToken: string = '';
  private webAppUrl: string = '';
  private isConfigured: boolean = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private pollingOffset: number = 0;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Admin)
    private adminRepo: Repository<Admin>,
  ) {
    this.botToken = this.configService.get('ADMIN_TG_BOT_TOKEN') || this.configService.get('ADMIN_BOT_TOKEN') || '';
    this.webAppUrl = this.configService.get('TELEGRAM_WEB_APP_URL') || '';
    
    this.isConfigured = !!(this.botToken && this.webAppUrl);
    
    if (!this.isConfigured) {
      this.logger.warn('⚠️ Admin bot is not configured (missing ADMIN_TG_BOT_TOKEN or TELEGRAM_WEB_APP_URL)');
    } else {
      this.logger.log(`✅ Admin bot configured with token: ${this.botToken.substring(0, 10)}...`);
      this.logger.log(`✅ Web App URL: ${this.webAppUrl}`);
    }
  }

  async onModuleInit() {
    if (this.isConfigured) {
      this.logger.log('🤖 Admin Bot initialized');
      await this.setupMenuButton();
      
      // Start polling in development mode
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

  /**
   * Настраивает Menu Button для открытия Web App
   */
  private async setupMenuButton() {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/setChatMenuButton`;
      
      await axios.post(url, {
        menu_button: {
          type: 'web_app',
          text: '📊 Admin Panel',
          web_app: {
            url: this.webAppUrl,
          },
        },
      });

      this.logger.log('✅ Menu button configured successfully');
    } catch (error) {
      this.logger.error('❌ Failed to setup menu button:', error.message);
    }
  }

  /**
   * Отправляет приветственное сообщение админу
   */
  async sendWelcomeMessage(chatId: string, firstName: string, isAdmin: boolean = false) {
    if (!this.isConfigured) return;

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
      } else {
        text = `👋 Привет, ${firstName}!\n\n` +
               `❌ У вас нет доступа к админ-панели.\n\n` +
               `Если вы администратор, обратитесь к главному администратору для получения доступа.`;
      }

      await this.sendMessage(chatId, text, isAdmin ? this.getWebAppKeyboard() : undefined);
    } catch (error) {
      this.logger.error('Failed to send welcome message:', error.message);
    }
  }

  /**
   * Получает клавиатуру с кнопкой для открытия Web App
   */
  private getWebAppKeyboard() {
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

  /**
   * Отправляет сообщение в Telegram
   */
  async sendMessage(chatId: string, text: string, replyMarkup?: any) {
    if (!this.isConfigured) return;

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

      await axios.post(url, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
    } catch (error) {
      this.logger.error('Failed to send message:', error.message);
    }
  }

  /**
   * Обрабатывает сообщения от админ-бота
   */
  async handleMessage(message: any) {
    if (!this.isConfigured) return;

    const chatId = message.chat.id.toString();
    const text = message.text;
    const from = message.from;
    const tgId = from.id.toString();

    // Проверка прав администратора
    const admin = await this.adminRepo.findOne({ where: { tg_id: tgId } });
    const isAdmin = !!admin;

    this.logger.log(`📨 Message from ${from.username || from.first_name} (${tgId}): ${text}`);
    this.logger.log(`🔐 Admin check: ${isAdmin ? 'YES' : 'NO'}`);

    // Обработка команд
    if (text === '/start') {
      await this.sendWelcomeMessage(chatId, from.first_name, isAdmin);
    } else if (text === '/help') {
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
      } else {
        await this.sendMessage(
          chatId,
          '❌ У вас нет доступа к админ-панели.\n\nОбратитесь к главному администратору для получения доступа.',
        );
      }
    } else if (text === '/stats' && isAdmin) {
      await this.sendQuickStats(chatId);
    } else if (text === '/info' && isAdmin) {
      await this.sendSystemInfo(chatId);
    } else {
      // Для других сообщений
      if (isAdmin) {
        await this.sendMessage(
          chatId,
          '📱 Используйте кнопку ниже для открытия админ-панели:',
          this.getWebAppKeyboard(),
        );
      } else {
        await this.sendMessage(
          chatId,
          '❌ У вас нет доступа к админ-панели.\n\nЕсли вы администратор, обратитесь к главному администратору.',
        );
      }
    }
  }

  /**
   * Отправляет быструю статистику
   */
  private async sendQuickStats(chatId: string) {
    try {
      // Здесь можно добавить реальную статистику из БД
      const text = `
📊 <b>Быстрая статистика</b>

⏰ Обновлено: ${new Date().toLocaleString('ru-RU')}

💡 Для полной статистики откройте админ-панель.`;

      await this.sendMessage(chatId, text, this.getWebAppKeyboard());
    } catch (error) {
      this.logger.error('Failed to send quick stats:', error.message);
    }
  }

  /**
   * Отправляет информацию о системе
   */
  private async sendSystemInfo(chatId: string) {
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
    } catch (error) {
      this.logger.error('Failed to send system info:', error.message);
    }
  }

  /**
   * Запускает polling для админ-бота
   */
  private startPolling() {
    if (!this.isConfigured) {
      this.logger.warn('⚠️ Admin bot polling is disabled (not configured)');
      return;
    }

    this.logger.log('🚀 Starting admin bot polling...');
    
    // Set interval to non-null to enable continuous polling
    this.pollingInterval = setInterval(() => {}, 1000000) as NodeJS.Timeout;
    this.pollUpdates();
  }

  /**
   * Polling loop для получения обновлений
   */
  private async pollUpdates() {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/getUpdates`;
      this.logger.debug(`🔍 Admin bot polling with offset: ${this.pollingOffset + 1}`);

      const response = await axios.get(url, {
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
      } else {
        this.logger.debug('📭 No new admin updates');
      }

      // Continue polling if not destroyed
      if (this.pollingInterval) {
        this.pollUpdates();
      }
    } catch (error) {
      this.logger.error('Admin bot polling error:', error.response?.status, error.response?.data || error.message);

      // Retry polling after error
      if (this.pollingInterval) {
        setTimeout(() => this.pollUpdates(), 5000);
      }
    }
  }

  /**
   * Отправляет уведомление администратору
   */
  async notifyAdmin(adminTgId: string, message: string, keyboard?: any) {
    if (!this.isConfigured) return;

    try {
      await this.sendMessage(adminTgId, message, keyboard);
      this.logger.log(`✅ Notification sent to admin ${adminTgId}`);
    } catch (error) {
      this.logger.error(`Failed to notify admin ${adminTgId}:`, error.message);
    }
  }

  /**
   * Отправляет уведомление всем администраторам
   */
  async notifyAllAdmins(message: string, keyboard?: any) {
    if (!this.isConfigured) return;

    try {
      const admins = await this.adminRepo.find();
      
      for (const admin of admins) {
        if (admin.tg_id) {
          await this.notifyAdmin(admin.tg_id, message, keyboard);
          // Небольшая задержка между отправками
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      this.logger.log(`✅ Notifications sent to ${admins.length} admins`);
    } catch (error) {
      this.logger.error('Failed to notify admins:', error.message);
    }
  }
}

