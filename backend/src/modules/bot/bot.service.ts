import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { User } from '../../entities/user.entity';
import { Button } from '../../entities/button.entity';
import { Task } from '../../entities/task.entity';
import { UserTask } from '../../entities/user-task.entity';
import { Scenario } from '../../entities/scenario.entity';
import { BalanceLog } from '../../entities/balance-log.entity';
import { FakeStatsService } from '../stats/fake-stats.service';
import { SettingsService } from '../settings/settings.service';
import { MessagesService } from '../messages/messages.service';
import { UsersService } from '../users/users.service';
import { SyncService } from '../sync/sync.service';
import { ChannelsService } from '../channels/channels.service';
import { CommandsService } from '../commands/commands.service';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private botToken: string = '';
  private pollingOffset: number = 0; // Start from 0 to get all messages
  private pollingInterval: NodeJS.Timeout | null = null;

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
    @InjectRepository(BalanceLog)
    private balanceLogRepo: Repository<BalanceLog>,
    private configService: ConfigService,
    private fakeStatsService: FakeStatsService,
    private settingsService: SettingsService,
    private messagesService: MessagesService,
    private usersService: UsersService,
    private syncService: SyncService,
    private channelsService: ChannelsService,
    @Inject(forwardRef(() => CommandsService))
    private commandsService: CommandsService,
  ) {
    this.logger.log('BotService constructor called');
    // Use CLIENT_BOT_TOKEN for client bot (user-facing), fallback to TELEGRAM_BOT_TOKEN
    const clientToken = this.configService.get('CLIENT_BOT_TOKEN');
    const telegramToken = this.configService.get('TELEGRAM_BOT_TOKEN');
    this.botToken = clientToken || telegramToken || '';
    this.logger.log(`Bot token loaded: ${this.botToken ? 'YES' : 'NO'}`);
    this.logger.log(
      `Bot token preview: ${this.botToken ? this.botToken.substring(0, 10) + '...' : 'EMPTY'}`,
    );
    
    // Log which env var was used
    if (clientToken) {
      this.logger.log(`✅ Using CLIENT_BOT_TOKEN for client bot (${clientToken.substring(0, 10)}...)`);
    } else if (telegramToken) {
      this.logger.log(`⚠️ Using TELEGRAM_BOT_TOKEN as fallback (${telegramToken.substring(0, 10)}...)`);
    }

    if (!this.botToken) {
      this.logger.error('⚠️ Neither TELEGRAM_BOT_TOKEN nor CLIENT_BOT_TOKEN is set!');
    }
  }

  /**
   * Subscribe to sync events for cache invalidation
   */
  async onModuleInit() {
    // Listen to sync events and invalidate cache
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

    // Start polling if bot token is set
    // In production, if webhook is not configured, use polling
    if (this.botToken) {
      const webhookUrl = this.configService.get('TELEGRAM_WEBHOOK_URL');
      // If webhook is not configured, use polling
      if (!webhookUrl || process.env.NODE_ENV === 'development') {
        this.logger.log('🤖 Starting bot polling (webhook not configured or development mode)');
        this.startPolling();
      } else {
        this.logger.log('📡 Webhook mode: polling disabled (use /api/bot/webhook)');
      }
    }
  }

  async onModuleDestroy() {
    // Stop polling when service is destroyed
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.logger.log('🛑 Bot polling stopped');
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

  /**
   * Start polling for updates (for development)
   */
  private startPolling() {
    this.logger.log('🤖 Starting bot polling...');
    // Set interval to non-null to enable continuous polling
    this.pollingInterval = setInterval(() => {}, 1000000) as NodeJS.Timeout; // Dummy interval, actual polling is recursive
    this.pollUpdates(); // Start polling once
  }

  /**
   * Poll for updates from Telegram API
   */
  private async pollUpdates() {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/getUpdates`;
      this.logger.debug(`🔍 Polling with offset: ${this.pollingOffset + 1}`);

      const response = await axios.get(url, {
        params: {
          offset: this.pollingOffset,
          limit: 100,
          timeout: 30, // 30 second long polling timeout
        },
      });

      this.logger.debug(`📡 Telegram API response: ${response.data.ok}, updates: ${response.data.result?.length || 0}`);

      const updates = response.data.result;
      if (updates && updates.length > 0) {
        this.logger.log(`📨 Received ${updates.length} update(s)`);

        for (const update of updates) {
          this.logger.debug(`📨 Processing update ${update.update_id}: ${update.message?.text || 'no text'}`);
          await this.handleWebhook(update);
          this.pollingOffset = update.update_id + 1; // Set to next expected update_id
        }
      } else {
        this.logger.debug('📭 No new updates');
      }

      // Continue polling
      if (this.pollingInterval) { // Check if not destroyed
        this.pollUpdates();
      }
    } catch (error) {
      this.logger.error('Failed to poll updates:', error.response?.status, error.response?.data || error.message);

      // Retry polling after error
      if (this.pollingInterval) {
        setTimeout(() => this.pollUpdates(), 5000); // Retry in 5 seconds
      }
    }
  }

  private async handleMessage(message: any) {
    const chatId = message.chat.id.toString();
    const text = message.text;

    // Check maintenance mode
    const maintenanceMode = await this.settingsService.getValue('maintenance_mode', 'false');
    if (maintenanceMode === 'true') {
      await this.sendMessage(chatId, '🛠 Бот находится на техническом обслуживании. Попробуйте позже.');
      return;
    }

    // Get or create user
    let user = await this.userRepo.findOne({ where: { tg_id: chatId } });
    const isNewUser = !user;

    if (!user) {
      // Check if registration is enabled
      const registrationEnabled = await this.settingsService.getValue('registration_enabled', 'true');
      if (registrationEnabled === 'false') {
        await this.sendMessage(chatId, '🚫 Регистрация новых пользователей временно приостановлена.');
        return;
      }

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

    // Handle media (photo, video, document) - save without responding
    const hasPhoto = message.photo && message.photo.length > 0;
    const hasVideo = message.video;
    const hasDocument = message.document;
    const caption = message.caption || '';

    if (hasPhoto || hasVideo || hasDocument) {
      try {
        let fileId: string;
        let mediaType: string;
        let fileName: string | undefined;

        if (hasPhoto) {
          // Get the largest photo
          const largestPhoto = message.photo[message.photo.length - 1];
          fileId = largestPhoto.file_id;
          mediaType = 'photo';
        } else if (hasVideo) {
          fileId = message.video.file_id;
          mediaType = 'video';
          fileName = message.video.file_name;
        } else if (hasDocument) {
          fileId = message.document.file_id;
          mediaType = 'document';
          fileName = message.document.file_name;
        } else {
          return; // Should not happen
        }

        // Get file path from Telegram
        const fileUrl = await this.getFileUrl(fileId);
        
        // Save media message without responding
        await this.messagesService.createUserMessage(user.id, caption, fileUrl, mediaType);
        this.logger.log(`Saved ${mediaType} from user ${chatId} (file: ${fileUrl})`);
        
        // Don't send any response - just save the media
        return;
      } catch (error) {
        this.logger.error(`Failed to save media from user ${chatId}:`, error);
        // Don't respond on error either
        return;
      }
    }

    // Handle commands
    if (text?.startsWith('/')) {
      await this.handleCommand(chatId, text, user);
    } else if (text?.startsWith('wallet ')) {
      // ✅ Check mandatory channel subscriptions for withdrawal
      const { allSubscribed, unsubscribedChannels } = await this.checkMandatoryChannels(user.tg_id);
      
      if (!allSubscribed) {
        await this.sendMessage(
          chatId,
          `🔔 *Обязательная подписка*\n\n` +
          `Для использования бота необходимо подписаться на наши каналы:\n\n` +
          unsubscribedChannels.map((ch, i) => `${i + 1}️⃣ ${ch.title}`).join('\n') +
          `\n\n_После подписки нажмите кнопку "Я подписался"_`,
          this.generateSubscriptionKeyboard(unsubscribedChannels, 'check_subscription'),
        );
        return;
      }
      
      // Handle withdrawal request
      await this.handleWithdrawalRequest(chatId, user, text);
    } else {
      // Handle ReplyKeyboard button clicks
      const handled = await this.handleReplyButton(chatId, text, user);
      if (handled) {
        return;
      }

      // ✅ Check mandatory channel subscriptions for scenarios and regular messages
      const { allSubscribed, unsubscribedChannels } = await this.checkMandatoryChannels(user.tg_id);
      
      if (!allSubscribed) {
        await this.sendMessage(
          chatId,
          `🔔 *Обязательная подписка*\n\n` +
          `Для использования бота необходимо подписаться на наши каналы:\n\n` +
          unsubscribedChannels.map((ch, i) => `${i + 1}️⃣ ${ch.title}`).join('\n') +
          `\n\n_После подписки нажмите кнопку "Я подписался"_`,
          this.generateSubscriptionKeyboard(unsubscribedChannels, 'check_subscription'),
        );
        return;
      }

      // Check for scenarios
      const scenario = await this.findMatchingScenario(text);
      if (scenario) {
        await this.handleScenario(chatId, user, scenario);
      } else {
        // Save user message
        await this.messagesService.createUserMessage(user.id, text);
        await this.sendMessage(chatId, 'Спасибо за ваше сообщение! Администратор скоро ответит.', await this.getReplyKeyboard());
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
        const refBonusPercent = await this.settingsService.getValue('ref_bonus_percent', '5.00');
        const bonusAmount = parseFloat(refBonusPercent); // Use setting value

        const balanceBefore = parseFloat(referrer.balance_usdt.toString());
        const balanceAfter = balanceBefore + bonusAmount;
        
        referrer.balance_usdt = balanceAfter;
        await this.userRepo.save(referrer);

        // Log balance change
        await this.balanceLogRepo.save({
          user_id: referrer.id,
          delta: bonusAmount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          reason: 'referral_bonus',
          comment: 'Бонус за приглашение реферала',
        });

        this.logger.log(`Referral bonus ${bonusAmount} USDT given to user ${referrerTgId}`);

        // Send notification (async, non-blocking)
        this.sendBalanceChangeNotification(
          referrerTgId,
          balanceBefore,
          balanceAfter,
          bonusAmount,
          'referral_bonus',
          'Бонус за приглашение реферала',
        ).catch(error => {
          this.logger.error(`Failed to send referral bonus notification:`, error.message);
        });

        // Update fake stats (async, non-blocking)
        this.fakeStatsService.regenerateFakeStats().catch(error => {
          this.logger.error(`Failed to update fake stats after referral bonus:`, error.message);
        });
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
      '👋 Добро пожаловать, {username}!\n\n💰 Ваш баланс: {balance} USDT\n📊 Всего заработано: {tasks_completed} заданий\n\n🎯 Выполняйте задания и зарабатывайте!\n👥 Приглашайте друзей по реферальной ссылке\n💸 Выводите заработанные средства\n\n📈 Сейчас онлайн: {fake.online} чел.\n✅ Активных пользователей: {fake.active}\n💵 Выплачено всего: ${fake.paid} USDT',
    );

    let text = greetingTemplate;
    if (fakeStats) {
      text = text
        .replace('{fake.online}', fakeStats.online.toString())
        .replace('{fake.active}', fakeStats.active.toString())
        .replace('{fake.paid}', fakeStats.paid_usdt.toString())
        .replace('{username}', user.username || user.first_name || 'Друг')
        .replace('{balance}', user.balance_usdt.toString())
        .replace('{tasks_completed}', user.tasks_completed.toString());
    }

    await this.sendMessage(chatId, text, await this.getReplyKeyboard());
  }

  private async handleCommand(chatId: string, command: string, user: User) {
    const cmd = command.split(' ')[0];

    // ✅ Check mandatory channel subscriptions for ALL commands (including /start!)
    const { allSubscribed, unsubscribedChannels } = await this.checkMandatoryChannels(user.tg_id);
    
    if (!allSubscribed) {
      await this.sendMessage(
        chatId,
        `🔔 *Обязательная подписка*\n\n` +
        `Добро пожаловать! Для использования бота необходимо подписаться на наши каналы:\n\n` +
        unsubscribedChannels.map((ch, i) => `${i + 1}️⃣ ${ch.title}`).join('\n') +
        `\n\n_После подписки нажмите кнопку "Я подписался"_`,
        this.generateSubscriptionKeyboard(unsubscribedChannels, 'check_subscription'),
      );
      return;
    }

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
        await this.sendWelcomeMessage(chatId, user);
        break;

      case '/help':
        await this.sendHelp(chatId);
        break;

      default:
        // Check if command is for a task
        const task = await this.taskRepo.findOne({ 
          where: { 
            command: cmd, 
            active: true 
          } 
        });
        
        if (task) {
          // Handle task command
          await this.handleTaskCommand(chatId, user, task);
        } else {
          // Check if it's a custom command
          const customCommand = await this.commandsService.findByName(cmd);
          
          if (customCommand) {
            // Execute custom command
            if (customCommand.media_url) {
              await this.sendMessageWithMedia(chatId, customCommand.response, customCommand.media_url);
            } else {
              await this.sendMessage(chatId, customCommand.response, await this.getReplyKeyboard());
            }
          } else {
            await this.sendMessage(chatId, 'Неизвестная команда. Используйте /help для списка команд.', await this.getReplyKeyboard());
          }
        }
    }
  }

  /**
   * Handle task command execution
   */
  private async handleTaskCommand(chatId: string, user: User, task: Task) {
    try {
      // Check cooldown
      if (task.cooldown_hours > 0) {
        const lastCompletion = await this.userTaskRepo.findOne({
          where: { user_id: user.id, task_id: task.id },
          order: { created_at: 'DESC' },
        });

        if (lastCompletion) {
          const hoursSinceCompletion = 
            (Date.now() - new Date(lastCompletion.created_at).getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceCompletion < task.cooldown_hours) {
            const remainingHours = Math.ceil(task.cooldown_hours - hoursSinceCompletion);
            await this.sendMessage(
              chatId,
              `⏳ Это задание можно выполнить повторно через ${remainingHours} ${remainingHours === 1 ? 'час' : 'часов'}.`,
              await this.getReplyKeyboard()
            );
            return;
          }
        }
      }

      // Check max completions per user
      const completedCount = await this.userTaskRepo.count({
        where: { user_id: user.id, task_id: task.id },
      });

      if (completedCount >= task.max_per_user) {
        await this.sendMessage(
          chatId,
          '✅ Вы уже выполнили это задание максимальное количество раз.',
          await this.getReplyKeyboard()
        );
        return;
      }

      // Create user task record
      const userTask = this.userTaskRepo.create({
        user_id: user.id,
        task_id: task.id,
        status: task.task_type === 'manual' ? 'pending' : 'completed',
        reward: task.reward_min + Math.random() * (task.reward_max - task.reward_min),
      });

      await this.userTaskRepo.save(userTask);

      // If task is not manual, automatically complete it
      if (task.task_type !== 'manual') {
        // Update user balance
        await this.usersService.updateBalance(
          user.tg_id,
          userTask.reward,
          `Выполнение задания: ${task.title}`,
        );

        // Update user stats
        await this.userRepo.update(user.id, {
          tasks_completed: user.tasks_completed + 1,
          total_earned: user.total_earned + userTask.reward,
        });

        await this.sendMessage(
          chatId,
          `✅ Задание "${task.title}" выполнено!\n\n` +
          `💰 Награда: ${userTask.reward.toFixed(2)} USDT\n\n` +
          `📊 Ваш баланс обновлен.`,
          await this.getReplyKeyboard()
        );
      } else {
        await this.sendMessage(
          chatId,
          `📝 Задание "${task.title}" отправлено на проверку.\n\n` +
          `⏳ Ожидайте подтверждения администратора.`,
          await this.getReplyKeyboard()
        );
      }
    } catch (error) {
      this.logger.error(`Error handling task command:`, error);
      await this.sendMessage(chatId, 'Произошла ошибка при выполнении задания. Попробуйте позже.', await this.getReplyKeyboard());
    }
  }

  private async sendHelp(chatId: string) {
    const text =
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

  private async sendAvailableTasks(chatId: string, user: User) {
    const tasks = await this.taskRepo.find({ where: { active: true } });

    if (tasks.length === 0) {
      await this.sendMessage(chatId, 'На данный момент нет доступных заданий.', {
        inline_keyboard: [[{ text: '🔙 Главное меню', callback_data: 'menu' }]],
      });
      return;
    }

    // Build message with statistics
    const completedTotal = await this.userTaskRepo.count({
      where: { user_id: user.id, status: 'completed' },
    });

    let message = 
      `📋 *Доступные задания*\n\n` +
      `✅ Выполнено: ${completedTotal} заданий\n` +
      `💰 Заработано: ${user.total_earned} USDT\n\n` +
      `Выберите задание:`;

    // Build interactive buttons for each task
    const keyboard: any[] = [];

    for (const task of tasks) {
      const completedCount = await this.userTaskRepo.count({
        where: { user_id: user.id, task_id: task.id, status: 'completed' },
      });

      // Check if task is available
      const canDo = completedCount < task.max_per_user;

      if (canDo) {
        // Get task status badge
        const inProgress = await this.userTaskRepo.findOne({
          where: { user_id: user.id, task_id: task.id, status: 'in_progress' },
        });

        const submitted = await this.userTaskRepo.findOne({
          where: { user_id: user.id, task_id: task.id, status: 'submitted' },
        });

        let badge = '🆕';
        if (submitted) {
          badge = '⏳'; // Waiting for verification
        } else if (inProgress) {
          badge = '▶️'; // In progress
        } else if (completedCount > 0 && completedCount < task.max_per_user) {
          badge = '🔄'; // Can repeat
        }

        // Progress indicator
        const progress = task.max_per_user > 1 ? ` (${completedCount}/${task.max_per_user})` : '';

        keyboard.push([{
          text: `${badge} ${task.title} ${progress}`,
          callback_data: `task_${task.id}`,
        }]);
      }
    }

    // Add action buttons
    keyboard.push([
      { text: '📚 Мои задания', callback_data: 'my_tasks' },
      { text: '🔙 Главное меню', callback_data: 'menu' },
    ]);

    await this.sendMessage(chatId, message, { inline_keyboard: keyboard });
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

    // ✅ Check mandatory channel subscriptions (skip for check_subscription action itself)
    if (data !== 'check_subscription' && data !== 'noop' && data !== 'menu') {
      const { allSubscribed, unsubscribedChannels } = await this.checkMandatoryChannels(tgId);
      
      if (!allSubscribed) {
        await this.sendMessage(
          chatId,
          `🔔 *Обязательная подписка*\n\n` +
          `Для использования бота необходимо подписаться на наши каналы:\n\n` +
          unsubscribedChannels.map((ch, i) => `${i + 1}️⃣ ${ch.title}`).join('\n') +
          `\n\n_После подписки нажмите кнопку "Я подписался"_`,
          this.generateSubscriptionKeyboard(unsubscribedChannels, data),
        );
        return;
      }
    }

    // Handle subscription check
    if (data === 'check_subscription') {
      const { allSubscribed, unsubscribedChannels } = await this.checkMandatoryChannels(tgId);
      
      if (!allSubscribed) {
        await this.sendMessage(
          chatId,
          `❌ *Вы еще не подписались на все каналы!*\n\n` +
          `Осталось подписаться на:\n` +
          unsubscribedChannels.map((ch, i) => `${i + 1}️⃣ ${ch.title}`).join('\n'),
          this.generateSubscriptionKeyboard(unsubscribedChannels, 'check_subscription'),
        );
      } else {
        await this.sendMessage(chatId, '✅ Отлично! Все подписки подтверждены!', await this.getReplyKeyboard());
      }
      return;
    }

    // Handle different button actions
    if (data === 'tasks') {
      await this.sendAvailableTasks(chatId, user);
    } else if (data === 'my_tasks') {
      await this.showMyTasks(chatId, user);
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
    } else if (data.startsWith('start_task_')) {
      await this.startTask(chatId, user, data);
    } else if (data.startsWith('submit_task_')) {
      await this.submitTask(chatId, user, data);
    } else if (data.startsWith('cancel_task_')) {
      await this.cancelTask(chatId, user, data);
    } else if (data === 'noop') {
      // Do nothing - just acknowledge the callback
      return;
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
    // Try to get from cache first
    const cacheKey = 'buttons:main_keyboard';
    const cached = this.syncService.getCache(cacheKey);
    
    if (cached) {
      this.logger.debug('✅ Using cached main keyboard');
      return cached;
    }

    // Fetch from database
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

    const result = {
      inline_keyboard: keyboard,
    };

    // Cache for 60 seconds (will be invalidated on button changes)
    this.syncService.setCache(cacheKey, result, 60);

    return result;
  }

  /**
   * Get Reply Keyboard (постоянные кнопки внизу экрана)
   * Загружает кнопки из БД и объединяет с дефолтными
   */
  private async getReplyKeyboard() {
    // Try to get from cache first
    const cacheKey = 'buttons:reply_keyboard';
    const cached = this.syncService.getCache(cacheKey);
    
    if (cached) {
      this.logger.debug('✅ Using cached reply keyboard');
      return cached;
    }

    // Fetch custom buttons from database
    const dbButtons = await this.buttonRepo.find({
      where: { active: true },
      order: { row: 'ASC', col: 'ASC' },
    });

    const keyboard: any[] = [];
    const rows: any = {};

    // Add custom buttons from DB
    for (const button of dbButtons) {
      if (!rows[button.row]) {
        rows[button.row] = [];
      }
      rows[button.row].push({
        text: button.label,
      });
    }

    // If no custom buttons or not enough rows, add default buttons
    if (Object.keys(rows).length === 0) {
      // Default keyboard
      keyboard.push(
        [{ text: '📋 Задания' }, { text: '💰 Баланс' }],
        [{ text: '👤 Профиль' }, { text: '👥 Рефералы' }],
        [{ text: '💸 Вывести' }, { text: 'ℹ️ Помощь' }],
      );
    } else {
      // Convert rows object to array
      for (const rowKey of Object.keys(rows).sort((a, b) => parseInt(a) - parseInt(b))) {
        keyboard.push(rows[rowKey]);
      }

      // Add default "Помощь" button if not present
      const hasHelp = dbButtons.some(b => 
        b.label.includes('Помощь') || b.label.includes('Помощь') || b.label === 'ℹ️ Помощь'
      );
      if (!hasHelp && keyboard.length > 0) {
        // Add help button to last row if there's space, otherwise new row
        const lastRow = keyboard[keyboard.length - 1];
        if (lastRow.length < 2) {
          lastRow.push({ text: 'ℹ️ Помощь' });
        } else {
          keyboard.push([{ text: 'ℹ️ Помощь' }]);
        }
      }
    }

    const result = {
      keyboard,
      resize_keyboard: true,
      persistent: true,
    };

    // Cache for 60 seconds (will be invalidated on button changes)
    this.syncService.setCache(cacheKey, result, 60);

    return result;
  }

  /**
   * Handle Reply Keyboard button clicks
   * Поддерживает как дефолтные, так и кастомные кнопки из БД
   */
  private async handleReplyButton(chatId: string, text: string, user: User): Promise<boolean> {
    // ✅ Check mandatory channel subscriptions for ALL actions (no exceptions)
    const { allSubscribed, unsubscribedChannels } = await this.checkMandatoryChannels(user.tg_id);
    
    if (!allSubscribed) {
      await this.sendMessage(
        chatId,
        `🔔 *Обязательная подписка*\n\n` +
        `Для использования бота необходимо подписаться на наши каналы:\n\n` +
        unsubscribedChannels.map((ch, i) => `${i + 1}️⃣ ${ch.title}`).join('\n') +
        `\n\n_После подписки нажмите кнопку "Я подписался"_`,
        this.generateSubscriptionKeyboard(unsubscribedChannels, 'check_subscription'),
      );
      return true;
    }

    // Check default buttons first
    switch (text) {
      case '📋 Задания':
        await this.sendAvailableTasks(chatId, user);
        return true;

      case '💰 Баланс':
        await this.sendBalance(chatId, user);
        return true;

      case '👤 Профиль':
        await this.sendProfile(chatId, user);
        return true;

      case '👥 Рефералы':
        await this.sendReferralInfo(chatId, user);
        return true;

      case '💸 Вывести':
        await this.sendWithdrawInfo(chatId, user);
        return true;

      case 'ℹ️ Помощь':
        await this.sendHelp(chatId);
        return true;

      default:
        // Check if it's a custom button from DB
        const button = await this.buttonRepo.findOne({ 
          where: { label: text, active: true } 
        });
        
        if (button) {
          await this.handleCustomButton(chatId, user, button);
          return true;
        }
        
        return false;
    }
  }

  async sendMessage(chatId: string, text: string, replyMarkup?: any) {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    try {
      this.logger.debug(`📤 Sending message to ${chatId}, text length: ${text?.length || 0}`);
      const response = await axios.post(url, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
      this.logger.debug(`✅ Message sent successfully to ${chatId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Failed to send message to ${chatId}:`, error.message);
      if (error.response?.data) {
        this.logger.error(`Telegram API error:`, JSON.stringify(error.response.data));
      }
      throw error;
    }
  }

  /**
   * Get file URL from Telegram file_id
   */
  private async getFileUrl(fileId: string): Promise<string> {
    try {
      // Get file info from Telegram
      const getFileUrl = `https://api.telegram.org/bot${this.botToken}/getFile`;
      const response = await axios.post(getFileUrl, {
        file_id: fileId,
      });

      const filePath = response.data.result.file_path;
      
      // Build full URL
      const fileUrl = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
      
      return fileUrl;
    } catch (error) {
      this.logger.error(`Failed to get file URL for file_id ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Send message with media (photo, video, or document)
   */
  async sendMessageWithMedia(chatId: string, text: string, mediaUrl: string, mediaType?: string) {
    try {
      // Determine media type from URL if not provided
      if (!mediaType) {
        if (mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          mediaType = 'photo';
        } else if (mediaUrl.match(/\.(mp4|webm|ogg)$/i)) {
          mediaType = 'video';
        } else {
          mediaType = 'document';
        }
      }

      // Select appropriate Telegram API method
      let method: string;
      let mediaField: string;

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

      // Send media by URL
      await axios.post(url, {
        chat_id: chatId,
        [mediaField]: mediaUrl,
        caption: text || undefined,
        parse_mode: text ? 'HTML' : undefined,
      });

      this.logger.log(`✅ Sent ${mediaType} message to ${chatId}`);
    } catch (error: any) {
      // Log error but don't send fallback message - it reveals technical details
      this.logger.error(`❌ Failed to send media message to ${chatId}:`, {
        error: error.response?.data || error.message,
        mediaUrl,
        mediaType,
        status: error.response?.status,
      });
      // Don't send fallback message - message is already saved in DB
      // Silent failure - user won't see error message
    }
  }

  /**
   * Send balance change notification to user
   * @param chatId User's Telegram ID
   * @param balanceBefore Balance before change
   * @param balanceAfter Balance after change
   * @param delta Amount changed (positive for addition, negative for deduction)
   * @param reason Type of operation (manual_adjustment, payout, task_reward, etc.)
   * @param comment Optional admin comment/reason
   */
  async sendBalanceChangeNotification(
    chatId: string,
    balanceBefore: number,
    balanceAfter: number,
    delta: number,
    reason: string,
    comment?: string,
  ) {
    try {
      this.logger.log(`Sending balance notification to ${chatId}: delta=${delta}, reason=${reason}`);

      const isAddition = delta > 0;
      const emoji = isAddition ? '💰' : '💸';
      const operationType = isAddition ? 'Пополнение' : 'Списание';
      const amountStr = isAddition ? `+${delta.toFixed(2)}` : delta.toFixed(2);

      // Format reason for display
      let reasonText = comment || 'Причина не указана';
      
      // Translate common reason codes to Russian
      const reasonTranslations: Record<string, string> = {
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
      } else if (!comment) {
        reasonText = reason;
      }

      const currentDate = new Date().toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const message =
        `${emoji} *${operationType} баланса*\n\n` +
        `💵 Сумма: *${amountStr} USDT*\n` +
        `📊 Было: ${balanceBefore.toFixed(2)} USDT\n` +
        `📈 Стало: *${balanceAfter.toFixed(2)} USDT*\n\n` +
        `📝 Причина: _${reasonText}_\n` +
        `📅 Дата: ${currentDate}`;

      await this.sendMessage(chatId, message);
      
      this.logger.log(`✅ Balance notification sent successfully to ${chatId}`);
    } catch (error) {
      // Handle common Telegram errors
      if (error.response?.data?.error_code === 403) {
        this.logger.warn(`User ${chatId} has blocked the bot - notification not sent`);
      } else if (error.response?.data?.description?.includes('chat not found')) {
        this.logger.warn(`Chat ${chatId} not found - notification not sent`);
      } else {
        this.logger.error(`Failed to send balance notification to ${chatId}:`, error.message);
        if (error.response?.data) {
          this.logger.error('Telegram API error:', JSON.stringify(error.response.data));
        }
      }
      // Don't throw error - notification failure should not break the transaction
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
      `💵 Доступно: *${user.balance_usdt} USDT*\n` +
      `📊 Всего заработано: ${user.total_earned} USDT\n` +
      `✅ Выполнено заданий: ${user.tasks_completed}\n\n` +
      `💸 Для вывода используйте кнопку "*Вывести*" внизу\n` +
      `📋 Выполняйте задания чтобы заработать больше!`;

    await this.sendMessage(chatId, text, await this.getReplyKeyboard());
  }

  private async sendProfile(chatId: string, user: User) {
    const refCount = await this.userRepo.count({
      where: { referred_by: user.id },
    });

    const text =
      `👤 *Ваш профиль*\n\n` +
      `🆔 ID: \`${user.tg_id}\`\n` +
      `👤 Имя: ${user.first_name || 'Не указано'}\n` +
      `📱 Username: @${user.username || 'не указан'}\n\n` +
      `💰 Баланс: *${user.balance_usdt} USDT*\n` +
      `📊 Заработано: ${user.total_earned} USDT\n` +
      `✅ Заданий выполнено: ${user.tasks_completed}\n` +
      `👥 Приглашено рефералов: ${refCount}\n\n` +
      `📅 В системе с: ${new Date(user.registered_at).toLocaleDateString('ru-RU')}`;

    await this.sendMessage(chatId, text, await this.getReplyKeyboard());
  }

  private async sendWithdrawInfo(chatId: string, user: User) {
    const minWithdraw = await this.settingsService.getValue('min_withdraw_usdt', '10.00');

    if (parseFloat(user.balance_usdt.toString()) < parseFloat(minWithdraw)) {
      await this.sendMessage(
        chatId,
        `❌ *Недостаточно средств для вывода*\n\n` +
        `Минимальная сумма: ${minWithdraw} USDT\n` +
        `Ваш баланс: ${user.balance_usdt} USDT\n\n` +
        `📋 Выполните больше заданий чтобы заработать!`,
        await this.getReplyKeyboard(),
      );
      return;
    }

    const text =
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

  private async sendReferralInfo(chatId: string, user: User) {
    const refCount = await this.userRepo.count({
      where: { referred_by: user.id },
    });

    const refBonusPercent = await this.settingsService.getValue('ref_bonus_percent', '5.00');
    const botUsername = await this.settingsService.getValue('bot_username', 'yourbot');
    const refLink = `https://t.me/${botUsername}?start=ref${user.tg_id}`;

    const text =
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

  private async handleTaskAction(chatId: string, user: User, data: string) {
    const taskId = data.replace('task_', '');
    const task = await this.taskRepo.findOne({ where: { id: taskId } });

    if (!task || !task.active) {
      await this.sendMessage(chatId, '❌ Задание недоступно', {
        inline_keyboard: [[{ text: '🔙 К заданиям', callback_data: 'tasks' }]],
      });
      return;
    }

    // Check completed count
    const completedCount = await this.userTaskRepo.count({
      where: { user_id: user.id, task_id: task.id, status: 'completed' },
    });

    if (completedCount >= task.max_per_user) {
      await this.sendMessage(chatId, '✅ Вы уже выполнили это задание максимальное количество раз', {
        inline_keyboard: [[{ text: '🔙 К заданиям', callback_data: 'tasks' }]],
      });
      return;
    }

    // Check if task is in progress or submitted
    const existingTask = await this.userTaskRepo.findOne({
      where: { user_id: user.id, task_id: task.id, status: 'in_progress' },
    });

    const submittedTask = await this.userTaskRepo.findOne({
      where: { user_id: user.id, task_id: task.id, status: 'submitted' },
    });

    // Build detailed task card
    let text = `📋 *${task.title}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `📝 *Описание:*\n${task.description}\n\n`;
    text += `💰 *Награда:* ${task.reward_min}`;
    if (task.reward_max > task.reward_min) {
      text += `-${task.reward_max}`;
    }
    text += ` USDT\n\n`;

    // Progress
    text += `📊 *Прогресс:* ${completedCount}/${task.max_per_user} выполнено\n\n`;

    // Action URL
    if (task.action_url) {
      text += `🔗 *Ссылка:* ${task.action_url}\n\n`;
    }

    // Status
    if (submittedTask) {
      text += `⏳ *Статус:* Ожидает проверки администратором\n`;
    } else if (existingTask) {
      text += `▶️ *Статус:* Задание в процессе выполнения\n`;
    } else {
      text += `🆕 *Статус:* Готово к выполнению\n`;
    }

    // Keyboard
    const keyboard: any[] = [];

    if (submittedTask) {
      // Already submitted, waiting for verification
      keyboard.push([{ text: '⏳ Ожидает проверки...', callback_data: 'noop' }]);
    } else if (existingTask) {
      // In progress - show submit button
      keyboard.push([{ text: '✅ Я выполнил задание', callback_data: `submit_task_${task.id}` }]);
      keyboard.push([{ text: '❌ Отменить', callback_data: `cancel_task_${task.id}` }]);
    } else {
      // Not started - show start button
      keyboard.push([{ text: '▶️ Начать задание', callback_data: `start_task_${task.id}` }]);
    }

    keyboard.push([{ text: '🔙 К заданиям', callback_data: 'tasks' }]);

    await this.sendMessage(chatId, text, { inline_keyboard: keyboard });
  }

  private async startTask(chatId: string, user: User, data: string) {
    const taskId = data.replace('start_task_', '');
    const task = await this.taskRepo.findOne({ where: { id: taskId } });

    if (!task || !task.active) {
      await this.sendMessage(chatId, '❌ Задание недоступно');
      return;
    }

    // Create in_progress record
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

  private async submitTask(chatId: string, user: User, data: string) {
    const taskId = data.replace('submit_task_', '');
    const task = await this.taskRepo.findOne({ where: { id: taskId } });

    if (!task || !task.active) {
      await this.sendMessage(chatId, '❌ Задание недоступно');
      return;
    }

    // Find in-progress task
    const userTask = await this.userTaskRepo.findOne({
      where: { user_id: user.id, task_id: task.id, status: 'in_progress' },
    });

    if (!userTask) {
      await this.sendMessage(chatId, '❌ Задание не найдено. Начните его выполнение заново.');
      return;
    }

    // ⏱️ ПРОВЕРКА МИНИМАЛЬНОГО ВРЕМЕНИ ВЫПОЛНЕНИЯ
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
        } else {
          timeText = `${minutes} мин`;
        }

        await this.sendMessage(
          chatId,
          `⏳ *Подождите немного!*\n\n` +
          `Кнопка подтверждения выполнения станет доступна через:\n` +
          `⏱️ ${timeText}\n\n` +
          `Это необходимо для проверки честного выполнения задания.`,
          {
            inline_keyboard: [
              [{ text: '🔙 К заданиям', callback_data: 'tasks' }],
            ],
          },
        );
        return;
      }
    }

    // ✅ ПРОВЕРКА ПОДПИСКИ НА КАНАЛ (если указан channel_id)
    if (task.task_type === 'subscription' && task.channel_id) {
      const isSubscribed = await this.checkChannelSubscription(user.tg_id, task.channel_id);

      if (!isSubscribed) {
        await this.sendMessage(
          chatId,
          `❌ *Подписка не найдена!*\n\n` +
          `Для получения награды необходимо:\n` +
          `1️⃣ Подписаться на канал\n` +
          `2️⃣ Нажать "Проверить подписку"`,
          {
            inline_keyboard: [
              [{ text: '📢 Подписаться на канал', url: `https://t.me/${task.channel_id.replace('@', '')}` }],
              [{ text: '🔄 Проверить подписку', callback_data: `submit_task_${taskId}` }],
              [{ text: '🔙 К заданиям', callback_data: 'tasks' }],
            ],
          },
        );
        return;
      }

      this.logger.log(`✅ Subscription verified: user ${user.tg_id}, channel ${task.channel_id}`);
    }

    // Calculate reward
    const reward =
      Math.floor(Math.random() * (task.reward_max - task.reward_min + 1)) + task.reward_min;

    // Check if task requires manual review
    // - task_type = 'manual' always requires review
    // - high reward tasks (> 50 USDT) require review
    const requiresManualReview = task.task_type === 'manual' || task.reward_max > 50;

    if (requiresManualReview) {
      // Submit for manual review
      userTask.status = 'submitted';
      userTask.reward = reward;
      userTask.submitted_at = new Date();
      await this.userTaskRepo.save(userTask);

      await this.sendMessage(
        chatId,
        `⏳ *Задание отправлено на проверку!*\n\n` +
        `📋 ${task.title}\n` +
        `💰 Потенциальная награда: ${reward} USDT\n\n` +
        `Администратор проверит выполнение в ближайшее время. ` +
        `Вы получите уведомление о результатах проверки.`,
        {
          inline_keyboard: [[{ text: '🔙 К заданиям', callback_data: 'tasks' }]],
        },
      );

      // TODO: Notify admin about new submission
    } else {
      // Auto-approve
      userTask.status = 'completed';
      userTask.reward = reward;
      userTask.completed_at = new Date();
      await this.userTaskRepo.save(userTask);

      // Update user balance and stats (convert to number to avoid string concatenation)
      const balanceBefore = parseFloat(user.balance_usdt.toString());
      const balanceAfter = balanceBefore + reward;
      
      user.balance_usdt = balanceAfter;
      user.total_earned = parseFloat(user.total_earned.toString()) + reward;
      user.tasks_completed = user.tasks_completed + 1;
      await this.userRepo.save(user);

      // Log balance change
      await this.balanceLogRepo.save({
        user_id: user.id,
        delta: reward,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reason: 'task_reward',
        comment: `Награда за выполнение задания: ${task.title}`,
      });

      this.logger.log(`User ${user.tg_id} completed task ${task.id} and earned ${reward} USDT`);

      await this.sendMessage(
        chatId,
        `✅ *Задание выполнено!*\n\n` +
        `📋 ${task.title}\n` +
        `💰 Получено: +${reward} USDT\n\n` +
        `Ваш баланс: ${user.balance_usdt} USDT`,
        {
          inline_keyboard: [
            [{ text: '📋 Другие задания', callback_data: 'tasks' }],
            [{ text: '💰 Мой баланс', callback_data: 'balance' }],
          ],
        },
      );

      // Send balance change notification (async, non-blocking)
      this.sendBalanceChangeNotification(
        user.tg_id,
        balanceBefore,
        balanceAfter,
        reward,
        'task_reward',
        `Награда за выполнение задания: ${task.title}`,
      ).catch(error => {
        this.logger.error(`Failed to send task reward notification:`, error.message);
      });

      // Update fake stats (async, non-blocking)
      this.fakeStatsService.regenerateFakeStats().catch(error => {
        this.logger.error(`Failed to update fake stats after task completion:`, error.message);
      });
    }
  }

  private async cancelTask(chatId: string, user: User, data: string) {
    const taskId = data.replace('cancel_task_', '');

    // Find and delete in-progress task
    const userTask = await this.userTaskRepo.findOne({
      where: { user_id: user.id, task_id: taskId, status: 'in_progress' },
    });

    if (userTask) {
      await this.userTaskRepo.remove(userTask);
      await this.sendMessage(chatId, '❌ Задание отменено', {
        inline_keyboard: [[{ text: '🔙 К заданиям', callback_data: 'tasks' }]],
      });
    } else {
      await this.sendMessage(chatId, 'Задание не найдено', {
        inline_keyboard: [[{ text: '🔙 К заданиям', callback_data: 'tasks' }]],
      });
    }
  }

  private async showMyTasks(chatId: string, user: User) {
    // Get all user tasks
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

    // Active tasks
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

    // Completed tasks
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

    // Statistics
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

  private async handleCustomButton(chatId: string, user: User, button: Button) {
    // If button has a command, execute it first
    if (button.command) {
      this.logger.log(`Executing command from button ${button.id}: ${button.command}`);
      await this.handleCommand(chatId, button.command, user);
      // If button has only command and no other content, return early
      if (!button.action_payload && !button.media_url) {
        return;
      }
    }

    // Handle custom button from database based on action_type
    let text = 'Информация';
    let keyboard: any = { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'menu' }]] };

    // Check if button has inline_buttons in payload
    if (button.action_payload?.inline_buttons && Array.isArray(button.action_payload.inline_buttons)) {
      // Build inline keyboard from payload
      const inlineKeyboard: any[] = [];
      
      // Group buttons into rows (default: one button per row, or you can implement row logic)
      button.action_payload.inline_buttons.forEach((btn: any) => {
        if (btn.url) {
          inlineKeyboard.push([{ text: btn.text, url: btn.url }]);
        } else if (btn.web_app?.url) {
          inlineKeyboard.push([{ text: btn.text, web_app: { url: btn.web_app.url } }]);
        } else if (btn.callback_data) {
          inlineKeyboard.push([{ text: btn.text, callback_data: btn.callback_data }]);
        }
      });
      
      // Add back button if not present
      if (inlineKeyboard.length > 0) {
        inlineKeyboard.push([{ text: '🔙 Назад', callback_data: 'menu' }]);
      }
      
      keyboard = { inline_keyboard: inlineKeyboard };
      
      // Extract text from payload
      if (button.action_payload.text) {
        text = button.action_payload.text;
      } else if (button.action_payload?.text?.text) {
        text = button.action_payload.text.text;
      } else {
        text = button.label || 'Информация';
      }
      
      // Replace variables in text
      text = text
        .replace(/{username}/g, user.username || user.first_name || 'Друг')
        .replace(/{balance}/g, user.balance_usdt.toString())
        .replace(/{tasks_completed}/g, user.tasks_completed.toString());
      
      // Send message with media if available
      if (button.media_url) {
        try {
          const mediaUrl = button.media_url;
          // Remove query parameters before extracting extension
          const urlWithoutQuery = mediaUrl.split('?')[0];
          const ext = urlWithoutQuery.split('.').pop()?.toLowerCase() || '';
          let mediaType = 'photo';
          
          if (['mp4', 'mov', 'avi', 'webm', 'ogg'].includes(ext)) {
            mediaType = 'video';
          } else if (['pdf', 'doc', 'docx', 'txt', 'zip', 'rar'].includes(ext)) {
            mediaType = 'document';
          } else if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            // If extension is not recognized as image, default to photo
            mediaType = 'photo';
          }
          
          this.logger.log(`Sending media for button ${button.id}: ${mediaType} from ${mediaUrl}`);
          
          await this.sendMessageWithMedia(chatId, text, mediaUrl, mediaType);
          
          // Send inline buttons separately if they exist
          if (keyboard && keyboard.inline_keyboard && keyboard.inline_keyboard.length > 0) {
            await this.sendMessage(chatId, '👇 Выберите действие:', keyboard);
          }
        } catch (error) {
          this.logger.error(`Failed to send media for button ${button.id}:`, error);
          await this.sendMessage(chatId, text, keyboard);
        }
      } else {
        await this.sendMessage(chatId, text, keyboard);
      }
      return;
    }

    // Handle text buttons - extract text from action_payload
    if (button.action_type === 'text' || button.action_type === 'send_message') {
      let payloadText = '';
      
      // Try to extract text from various payload structures
      if (typeof button.action_payload === 'string') {
        payloadText = button.action_payload;
      } else if (button.action_payload?.text) {
        if (typeof button.action_payload.text === 'string') {
          payloadText = button.action_payload.text;
        } else if (button.action_payload.text?.text) {
          payloadText = button.action_payload.text.text;
        }
      }
      
      if (payloadText) {
        text = payloadText
          .replace(/{username}/g, user.username || user.first_name || 'Друг')
          .replace(/{balance}/g, user.balance_usdt.toString())
          .replace(/{tasks_completed}/g, user.tasks_completed.toString());
      } else {
        text = button.label || 'Информация';
      }
    } else if (button.action_type === 'command' && button.action_payload?.command) {
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
    } else if (button.action_type === 'open_url' || (button.action_type === 'url' && button.action_payload?.url)) {
      text = button.action_payload?.text || 'Перейдите по ссылке ниже';
      
      // Check if there are additional inline buttons
      if (button.action_payload?.inline_buttons && Array.isArray(button.action_payload.inline_buttons)) {
        const inlineKeyboard: any[] = [];
        inlineKeyboard.push([{ text: '🔗 Перейти', url: button.action_payload.url }]);
        
        button.action_payload.inline_buttons.forEach((btn: any) => {
          if (btn.url) {
            inlineKeyboard.push([{ text: btn.text, url: btn.url }]);
          } else if (btn.web_app?.url) {
            inlineKeyboard.push([{ text: btn.text, web_app: { url: btn.web_app.url } }]);
          } else if (btn.callback_data) {
            inlineKeyboard.push([{ text: btn.text, callback_data: btn.callback_data }]);
          }
        });
        
        inlineKeyboard.push([{ text: '🔙 Назад', callback_data: 'menu' }]);
        keyboard = { inline_keyboard: inlineKeyboard };
      } else {
        keyboard = {
          inline_keyboard: [
            [{ text: '🔗 Перейти', url: button.action_payload.url }],
            [{ text: '🔙 Назад', callback_data: 'menu' }],
          ],
        };
      }
    }

    // Send message with media if available
    if (button.media_url) {
      try {
        // Determine media type from URL
        const mediaUrl = button.media_url;
        // Remove query parameters before extracting extension
        const urlWithoutQuery = mediaUrl.split('?')[0];
        const ext = urlWithoutQuery.split('.').pop()?.toLowerCase() || '';
        let mediaType = 'photo';
        
        if (['mp4', 'mov', 'avi', 'webm', 'ogg'].includes(ext)) {
          mediaType = 'video';
        } else if (['pdf', 'doc', 'docx', 'txt', 'zip', 'rar'].includes(ext)) {
          mediaType = 'document';
        } else if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          // If extension is not recognized as image, try to determine from content-type or default to photo
          mediaType = 'photo';
        }
        
        this.logger.log(`Sending media for button ${button.id}: ${mediaType} from ${mediaUrl}`);
        
        // Send media with text as caption
        await this.sendMessageWithMedia(chatId, text, mediaUrl, mediaType);
        
        // If there are inline buttons, send them separately
        if (keyboard && keyboard.inline_keyboard && keyboard.inline_keyboard.length > 0) {
          await this.sendMessage(chatId, '👇 Выберите действие:', keyboard);
        }
      } catch (error) {
        this.logger.error(`Failed to send media for button ${button.id}:`, error);
        // Fallback to text message if media fails
        await this.sendMessage(chatId, text, keyboard);
      }
    } else {
      // No media, send regular message
      await this.sendMessage(chatId, text, keyboard);
    }
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
    const balanceBefore = parseFloat(user.balance_usdt.toString());
    const balanceAfter = balanceBefore + reward;
    
    user.balance_usdt = balanceAfter;
    user.total_earned = parseFloat(user.total_earned.toString()) + reward;
    user.tasks_completed = user.tasks_completed + 1;
    await this.userRepo.save(user);

    // Log balance change
    await this.balanceLogRepo.save({
      user_id: user.id,
      delta: reward,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reason: 'task_reward',
      comment: `Награда за выполнение задания (верифицировано): ${task.title}`,
    });

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

    // Send balance change notification (async, non-blocking)
    this.sendBalanceChangeNotification(
      user.tg_id,
      balanceBefore,
      balanceAfter,
      reward,
      'task_reward',
      `Награда за выполнение задания (верифицировано): ${task.title}`,
    ).catch(error => {
      this.logger.error(`Failed to send task verification notification:`, error.message);
    });

    // Update fake stats (async, non-blocking)
    this.fakeStatsService.regenerateFakeStats().catch(error => {
      this.logger.error(`Failed to update fake stats after task verification:`, error.message);
    });
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

    // Try to get from cache first
    const cacheKey = 'scenarios:active';
    let scenarios = this.syncService.getCache<Scenario[]>(cacheKey);

    if (!scenarios) {
      // Fetch from database
      scenarios = await this.scenarioRepo.find({
        where: { is_active: true },
      });
      
      // Cache for 60 seconds (will be invalidated on scenario changes)
      this.syncService.setCache(cacheKey, scenarios, 60);
    }

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

        // Send message with media if available
        if (scenario.media_url) {
          try {
            const mediaUrl = scenario.media_url;
            // Remove query parameters before extracting extension
            const urlWithoutQuery = mediaUrl.split('?')[0];
            const ext = urlWithoutQuery.split('.').pop()?.toLowerCase() || '';
            let mediaType = 'photo';
            
            if (['mp4', 'mov', 'avi', 'webm', 'ogg'].includes(ext)) {
              mediaType = 'video';
            } else if (['pdf', 'doc', 'docx', 'txt', 'zip', 'rar'].includes(ext)) {
              mediaType = 'document';
            } else if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
              // If extension is not recognized as image, default to photo
              mediaType = 'photo';
            }
            
            this.logger.log(`Sending media for scenario ${scenario.id}: ${mediaType} from ${mediaUrl}`);
            await this.sendMessageWithMedia(chatId, text, mediaUrl, mediaType);
          } catch (error) {
            this.logger.error(`Failed to send media for scenario ${scenario.id}:`, error);
            // Fallback to text message if media fails
            await this.sendMessage(chatId, text);
          }
        } else {
          await this.sendMessage(chatId, text);
        }
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

  /**
   * Check mandatory channel subscriptions from database
   * @param userId Telegram user ID
   * @returns Object with subscribed status and list of unsubscribed channels
   */
  async checkMandatoryChannels(userId: string): Promise<{ 
    allSubscribed: boolean; 
    unsubscribedChannels: any[];
  }> {
    try {
      const activeChannels = await this.channelsService.findActive();
      
      if (activeChannels.length === 0) {
        return { allSubscribed: true, unsubscribedChannels: [] };
      }

      const unsubscribedChannels: any[] = [];

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
    } catch (error) {
      this.logger.error('Error checking mandatory channels:', error);
      // In case of error, allow action to proceed
      return { allSubscribed: true, unsubscribedChannels: [] };
    }
  }

  /**
   * Generate inline keyboard with subscription buttons
   * @param channels Array of channels to subscribe
   * @param callbackAction Action to perform after subscription (e.g. 'tasks', 'work')
   * @returns Inline keyboard markup
   */
  generateSubscriptionKeyboard(channels: any[], callbackAction: string = 'check_subscription') {
    const buttons: any[][] = [];
    
    // Add channel buttons (with URL)
    channels.forEach(channel => {
      const url = channel.url || `https://t.me/${channel.username || channel.channel_id.replace('@', '')}`;
      buttons.push([{ text: `📢 ${channel.title}`, url }]);
    });

    // Add confirmation button (with callback_data)
    buttons.push([{ text: '✅ Я подписался', callback_data: callbackAction }]);

    return { inline_keyboard: buttons };
  }

  /**
   * Check if user is subscribed to a Telegram channel
   * @param userId Telegram user ID (without chatId prefix)
   * @param channelId Channel ID (e.g. @channel_name or -1001234567890)
   * @returns true if subscribed, false otherwise
   */
  private async checkChannelSubscription(userId: string, channelId: string): Promise<boolean> {
    try {
      this.logger.debug(`🔍 Checking subscription: user=${userId}, channel=${channelId}`);
      
      const response = await axios.get(
        `https://api.telegram.org/bot${this.botToken}/getChatMember`,
        {
          params: {
            chat_id: channelId,
            user_id: userId,
          },
        },
      );

      this.logger.debug(`📡 Telegram API response:`, JSON.stringify(response.data, null, 2));

      if (response.data.ok) {
        const status = response.data.result.status;
        // User is subscribed if status is: creator, administrator, or member
        const isSubscribed = ['creator', 'administrator', 'member'].includes(status);
        
        this.logger.log(
          `✅ Subscription check: user ${userId}, channel ${channelId}, status=${status}, subscribed=${isSubscribed}`,
        );
        
        return isSubscribed;
      }

      this.logger.warn(
        `⚠️ Failed to check subscription: ${response.data.description || 'Unknown error'}`,
      );
      this.logger.warn(`Response:`, JSON.stringify(response.data, null, 2));
      return false;
    } catch (error) {
      this.logger.error(`❌ Error checking channel subscription for user ${userId}, channel ${channelId}:`);
      this.logger.error(`Error details:`, error.response?.data || error.message);
      if (error.response?.data) {
        this.logger.error(`Full error response:`, JSON.stringify(error.response.data, null, 2));
      }
      // In case of error (e.g. bot is not admin in channel), return false
      return false;
    }
  }
}

