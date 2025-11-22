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
import { Admin } from '../../entities/admin.entity';
import { FakeStatsService } from '../stats/fake-stats.service';
import { SettingsService } from '../settings/settings.service';
import { MessagesService } from '../messages/messages.service';
import { UsersService } from '../users/users.service';
import { SyncService } from '../sync/sync.service';
import { ChannelsService } from '../channels/channels.service';
import { CommandsService } from '../commands/commands.service';
import { RanksService } from '../ranks/ranks.service';
import { PremiumService } from '../premium/premium.service';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private botToken: string = '';
  private pollingOffset: number = 0; // Start from 0 to get all messages
  private pollingInterval: NodeJS.Timeout | null = null;
  private consecutiveErrors: number = 0; // Track consecutive 409 errors

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
    @InjectRepository(Admin)
    private adminRepo: Repository<Admin>,
    private configService: ConfigService,
    private fakeStatsService: FakeStatsService,
    private settingsService: SettingsService,
    private messagesService: MessagesService,
    private usersService: UsersService,
    private syncService: SyncService,
    private channelsService: ChannelsService,
    @Inject(forwardRef(() => CommandsService))
    private commandsService: CommandsService,
    @Inject(forwardRef(() => RanksService))
    private ranksService: RanksService,
    @Inject(forwardRef(() => PremiumService))
    private premiumService: PremiumService,
  ) {
    this.logger.log('BotService constructor called');
    // Use CLIENT_TG_BOT_TOKEN or CLIENT_BOT_TOKEN for client bot (user-facing), fallback to TELEGRAM_BOT_TOKEN
    const clientToken = this.configService.get('CLIENT_TG_BOT_TOKEN') || this.configService.get('CLIENT_BOT_TOKEN');
    const telegramToken = this.configService.get('TELEGRAM_BOT_TOKEN');
    this.botToken = clientToken || telegramToken || '';
    this.logger.log(`Bot token loaded: ${this.botToken ? 'YES' : 'NO'}`);
    this.logger.log(
      `Bot token preview: ${this.botToken ? this.botToken.substring(0, 10) + '...' : 'EMPTY'}`,
    );

    // Log which env var was used
    if (clientToken) {
      this.logger.log(`✅ Using CLIENT_TG_BOT_TOKEN/CLIENT_BOT_TOKEN for client bot (${clientToken.substring(0, 10)}...)`);
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
    // For client bot, always use polling by default (webhook requires manual setup via Telegram API)
    if (this.botToken) {
      const useWebhook = this.configService.get('USE_WEBHOOK', 'false') === 'true';
      const webhookUrl = this.configService.get('TELEGRAM_WEBHOOK_URL');

      // Always use polling unless explicitly disabled via USE_WEBHOOK=true
      // Webhook requires manual setup: DELETE webhook first, then set it via /api/bot/set-webhook
      if (!useWebhook) {
        this.logger.log('🤖 Starting client bot polling (polling mode - default)');
        this.logger.log('💡 To use webhook mode, set USE_WEBHOOK=true and configure webhook via /api/bot/set-webhook');

        // Delete any existing webhook to avoid conflicts
        try {
          this.logger.log('🔄 Deleting any existing webhook...');
          await this.deleteWebhook(true);
          this.logger.log('✅ Webhook deleted to avoid conflicts with polling');
          // Wait longer for Telegram API to fully process
          await new Promise(resolve => setTimeout(resolve, 5000));

          // Verify webhook is deleted
          try {
            const webhookInfo = await axios.get(`https://api.telegram.org/bot${this.botToken}/getWebhookInfo`);
            if (webhookInfo.data.result?.url) {
              this.logger.warn(`⚠️ Webhook still exists: ${webhookInfo.data.result.url}. Trying to delete again...`);
              await this.deleteWebhook(true);
              await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
              this.logger.log('✅ Webhook confirmed deleted');
            }
          } catch (verifyError) {
            this.logger.warn('⚠️ Could not verify webhook status:', verifyError.message);
          }
        } catch (error) {
          this.logger.warn('⚠️ Could not delete webhook (may not exist):', error.message);
        }

        // Reset polling offset to start fresh
        this.pollingOffset = 0;
        this.consecutiveErrors = 0;

        this.startPolling();
      } else {
        this.logger.log('📡 Webhook mode: polling disabled (USE_WEBHOOK=true)');
        if (webhookUrl) {
          this.logger.log(`📡 Webhook URL: ${webhookUrl}`);
        } else {
          this.logger.warn('⚠️ USE_WEBHOOK=true but TELEGRAM_WEBHOOK_URL is not set! Bot will not receive updates.');
        }
      }
    } else {
      this.logger.error('❌ Client bot token is not set! Bot will not respond to users.');
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
    } catch (error: any) {
      this.logger.error('Error handling webhook:', {
        error: error.message,
        stack: error.stack,
        updateId: update.update_id,
        message: update.message?.text || 'no text',
        chatId: update.message?.chat?.id || update.callback_query?.message?.chat?.id,
      });

      // Try to send error message to user if possible
      try {
        const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
        if (chatId) {
          await this.sendMessage(chatId.toString(), '⚠️ Произошла ошибка при обработке вашего сообщения. Попробуйте позже.');
        }
      } catch (sendError) {
        this.logger.error('Failed to send error message to user:', sendError);
      }
    }
  }

  /**
   * Start polling for updates (for development)
   */
  private startPolling() {
    this.logger.log('🤖 Starting bot polling...');
    // Set interval to non-null to enable continuous polling
    this.pollingInterval = setInterval(() => { }, 1000000) as NodeJS.Timeout; // Dummy interval, actual polling is recursive
    this.pollUpdates(); // Start polling once
  }

  /**
   * Poll for updates from Telegram API
   */
  private async pollUpdates() {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/getUpdates`;
      // Use offset+1 to get updates after the last processed one, or 0 to get all pending
      // NEVER use offset -1 as it causes infinite loops - always use proper offset
      const offset = this.pollingOffset > 0 ? this.pollingOffset + 1 : 0;
      this.logger.debug(`🔍 Polling with offset: ${offset} (last processed: ${this.pollingOffset})`);

      const response = await axios.get(url, {
        params: {
          offset: offset,
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
          try {
            await this.handleWebhook(update);
          } catch (error: any) {
            this.logger.error(`Failed to process update ${update.update_id}:`, error.message);
            // Continue processing other updates even if one fails
          }
          // Update offset to avoid processing same update again (even if there was an error)
          this.pollingOffset = Math.max(this.pollingOffset, update.update_id);
        }

        // After processing all updates, set offset to next expected update_id
        if (updates.length > 0) {
          const lastUpdateId = updates[updates.length - 1].update_id;
          this.pollingOffset = lastUpdateId + 1;
          this.consecutiveErrors = 0; // Reset error counter on successful processing
          this.logger.debug(`✅ Updated polling offset to: ${this.pollingOffset} (last update_id: ${lastUpdateId})`);
        }
      } else {
        this.logger.debug('📭 No new updates');
      }

      // Continue polling with a small delay to avoid overwhelming the API and prevent stack overflow
      if (this.pollingInterval) { // Check if not destroyed
        // Use setTimeout instead of immediate call to prevent stack overflow
        setTimeout(() => this.pollUpdates(), 100); // Small delay between polls
      }
    } catch (error) {
      const errorCode = error.response?.status;
      const errorData = error.response?.data;

      // Handle 409 conflict - another instance is polling
      if (errorCode === 409) {
        this.consecutiveErrors++;
        this.logger.warn(`⚠️ Conflict (409): Another bot instance may be running. Attempt ${this.consecutiveErrors}`);

        // After 3 consecutive 409 errors, wait longer before retrying (but don't stop completely)
        if (this.consecutiveErrors >= 3) {
          this.logger.error('❌ Too many 409 conflicts detected (3+). Waiting 5 minutes before retry...');
          this.logger.error('⚠️ Another bot instance is receiving updates. Please:');
          this.logger.error('   1. Check if another server/process is using the same bot token');
          this.logger.error('   2. Stop the other instance or use webhook mode instead');
          this.logger.error('   3. This bot will automatically retry in 5 minutes');

          // Wait 5 minutes before retrying (instead of stopping completely)
          // This allows the bot to automatically recover if the other instance is stopped
          if (this.pollingInterval) {
            setTimeout(() => {
              // Reset error counter and retry
              this.consecutiveErrors = 0;
              this.logger.log('🔄 Retrying polling after 5 minute wait...');
              this.pollUpdates();
            }, 5 * 60 * 1000); // 5 minutes
          }
          return;
        }
      } else {
        this.consecutiveErrors = 0; // Reset on non-409 errors
        this.logger.error('Failed to poll updates:', errorCode, errorData || error.message);
      }

      // Retry polling after error (if not already handled above)
      if (!this.pollingInterval) {
        // Polling was stopped, don't retry
        this.logger.debug('🛑 Polling is stopped, not retrying.');
        return;
      }

      if (errorCode !== 409) {
        setTimeout(() => this.pollUpdates(), 5000); // Retry in 5 seconds
      } else if (errorCode === 409 && this.consecutiveErrors < 3) {
        // Wait longer between retries for 409 errors to reduce load
        setTimeout(() => this.pollUpdates(), 15000); // Retry in 15 seconds for 409
      } else if (errorCode === 409 && this.consecutiveErrors >= 3) {
        // Don't retry - polling stopped due to too many conflicts
        this.logger.error('🛑 Polling stopped due to persistent 409 conflicts. Manual intervention required.');
        // Ensure polling is stopped (should already be stopped above, but double-check)
        if (this.pollingInterval) {
          clearInterval(this.pollingInterval);
          this.pollingInterval = null;
        }
      }
    }
  }

  private async handleMessage(message: any) {
    const chatId = message.chat.id.toString();
    const text = message.text;
    const messageId = message.message_id;

    // ===== DETAILED LOGGING START =====
    this.logger.log(`🔵 ════════════════════════════════════════`);
    this.logger.log(`🔵 [START] handleMessage`);
    this.logger.log(`🔵   chatId: ${chatId}`);
    this.logger.log(`🔵   text: "${text}"`);
    this.logger.log(`🔵   messageId: ${messageId}`);
    this.logger.log(`🔵   from: ${message.from?.username || message.from?.first_name || 'unknown'}`);
    this.logger.log(`🔵 ════════════════════════════════════════`);

    this.logger.debug(`📨 Received message: "${text}" from ${chatId}, starts with /: ${text?.startsWith('/')}`);

    // Check maintenance mode
    this.logger.debug(`🔍 [STEP 1/8] Checking maintenance mode...`);
    const maintenanceMode = await this.settingsService.getValue('maintenance_mode', 'false');
    if (maintenanceMode === 'true') {
      this.logger.warn(`⚠️ [EXIT] Maintenance mode active, rejecting message`);
      await this.sendMessage(chatId, '🛠 Бот находится на техническом обслуживании. Попробуйте позже.');
      return;
    }
    this.logger.debug(`✅ [STEP 1/8] Maintenance check passed`);

    // Get or create user
    this.logger.debug(`🔍 [STEP 2/8] Getting/creating user...`);
    let user = await this.userRepo.findOne({ where: { tg_id: chatId } });
    const isNewUser = !user;

    if (!user) {
      this.logger.log(`➕ [STEP 2/8] New user ${chatId}, creating...`);
      // Check if registration is enabled
      const registrationEnabled = await this.settingsService.getValue('registration_enabled', 'true');
      if (registrationEnabled === 'false') {
        this.logger.warn(`⚠️ [EXIT] Registration disabled, new user ${chatId} cannot register.`);
        await this.sendMessage(chatId, '🚫 Регистрация новых пользователей временно приостановлена.');
        return;
      }

      // Extract referral code from /start command
      let refBy: string | undefined;
      if (text?.startsWith('/start ref')) {
        refBy = text.replace('/start ref', '').trim();
      }

      user = await this.createUser(message.from, refBy);

      // Send welcome message (uses greeting_template from settings)
      await this.sendWelcomeMessage(chatId, user);

      // Notify referrer
      if (refBy && refBy !== chatId) {
        await this.notifyReferrer(refBy);
      }
      return;
    }

    // Check for blocked user - BLOCK ALL INTERACTIONS
    if (await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
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
    this.logger.debug(`🔍 [STEP 3/7] Checking if message is command...`);
    if (text?.startsWith('/')) {
      this.logger.log(`📋 [STEP 3/7] Command detected: ${text}`);

      // ✅ Check mandatory channel subscriptions for commands
      this.logger.debug(`🔍 [STEP 4/7] Checking mandatory channels...`);
      const { allSubscribed, unsubscribedChannels } = await this.checkMandatoryChannels(user.tg_id);

      if (!allSubscribed) {
        this.logger.warn(`⚠️ [EXIT] User not subscribed to ${unsubscribedChannels.length} mandatory channels`);
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
      this.logger.debug(`✅ [STEP 4/7] Mandatory channels check passed`);

      // CRITICAL: Check for blocked user BEFORE handling command
      // This check MUST happen before calling handleCommand
      this.logger.debug(`🔍 [STEP 5/7] Checking if user is blocked...`);
      const isBlocked = await this.checkUserBlocked(user);
      if (isBlocked) {
        this.logger.warn(`🔴 [EXIT] BLOCKED user ${user.tg_id} (ID: ${user.id}) attempted command: ${text}`);
        await this.sendMessage(
          chatId,
          '🔒 *Ваш аккаунт заблокирован*\n\n' +
          'Ваш аккаунт был заблокирован администратором.\n\n' +
          'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
          '_Доступ к боту временно ограничен._',
        );
        return; // CRITICAL: Stop processing immediately - do NOT call handleCommand
      }
      this.logger.debug(`✅ [STEP 5/7] User block check passed`);

      // Double-check before calling handleCommand
      this.logger.debug(`🔍 [STEP 6/7] Double-checking block status...`);
      if (await this.checkUserBlocked(user)) {
        this.logger.warn(`🔴 [EXIT] BLOCKED user ${user.tg_id} (ID: ${user.id}) attempted command: ${text} (double-check)`);
        await this.sendMessage(
          chatId,
          '🔒 *Ваш аккаунт заблокирован*\n\n' +
          'Ваш аккаунт был заблокирован администратором.\n\n' +
          'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
          '_Доступ к боту временно ограничен._',
        );
        return; // CRITICAL: Stop processing immediately - do NOT call handleCommand
      }
      this.logger.debug(`✅ [STEP 6/7] Double-check passed`);

      this.logger.log(`🎯 [STEP 7/7] Executing handleCommand for: ${text}`);
      await this.handleCommand(chatId, text, user);
      this.logger.log(`✅ [END] handleMessage completed for command: ${text}`);

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
      // Check for blocked user BEFORE handling reply button
      if (await this.checkUserBlocked(user)) {
        await this.sendMessage(
          chatId,
          '🔒 *Ваш аккаунт заблокирован*\n\n' +
          'Ваш аккаунт был заблокирован администратором.\n\n' +
          'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
          '_Доступ к боту временно ограничен._',
        );
        return;
      }

      // Handle ReplyKeyboard button clicks (только для текста, который НЕ начинается с /)
      // Команды уже обработаны выше
      const handled = await this.handleReplyButton(chatId, text, user);
      if (handled) {
        this.logger.debug(`✅ Reply button "${text}" handled successfully, stopping message processing`);
        return; // CRITICAL: Stop processing to avoid sending template message
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
        await this.sendMessage(chatId, 'Спасибо за ваше сообщение! Администратор скоро ответит.', await this.getReplyKeyboard(user.tg_id));
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

  /**
   * Check if user is blocked and refresh status from DB
   * Returns true if user is blocked, false otherwise
   * Updates user object with fresh data from DB
   */
  private async checkUserBlocked(user: User): Promise<boolean> {
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
    } catch (error) {
      this.logger.error(`Error checking user blocked status:`, error);
      return user.status === 'blocked';
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
    // Double-check: user should not be blocked (safety check)
    if (await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
      return;
    }

    // ✅ Check if /start command exists in database
    const startCommand = await this.commandsService.findByName('start');
    if (startCommand) {
      // Use command from database
      await this.handleCustomCommand(chatId, user, startCommand);
      return;
    }

    // ✅ No welcome message template - just return silently
    // All functionality should be accessed via commands or buttons from database
    return;
  }

  private async handleCommand(chatId: string, command: string, user: User) {
    // CRITICAL: Check for blocked user FIRST - before ANY command processing
    // This check MUST happen before any other logic
    const isBlocked = await this.checkUserBlocked(user);
    if (isBlocked) {
      this.logger.warn(`BLOCKED user ${user.tg_id} (ID: ${user.id}) attempted command: ${command}`);
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
      return; // CRITICAL: Stop processing immediately
    }

    let cmd = command.split(' ')[0];
    // Remove leading slash for database lookup
    const cmdName = cmd.startsWith('/') ? cmd.substring(1) : cmd;

    // ✅ Check mandatory channel subscriptions for ALL commands (including /start!)
    // BUT ONLY if user is not blocked
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

    // ✅ ALL commands come from database only - no built-in commands
    const dbCommand = await this.commandsService.findByName(cmdName);

    if (dbCommand) {
      // Execute command from database
      await this.handleCustomCommand(chatId, user, dbCommand);
      return;
    }

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
      return;
    }

    // ✅ Special handling for /start - if not in DB, use welcome message
    if (cmdName === 'start') {
      await this.sendWelcomeMessage(chatId, user);
      return;
    }

    // Command not found in database, tasks, or scenarios
    await this.sendMessage(
      chatId,
      '❓ Неизвестная команда.\n\nИспользуйте /start для просмотра доступных функций.',
      await this.getReplyKeyboard(user?.tg_id)
    );
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
              await this.getReplyKeyboard(user?.tg_id)
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
          await this.getReplyKeyboard(user?.tg_id)
        );
        return;
      }

      // Create user task record
      // Calculate reward correctly
      const reward_min = parseFloat(task.reward_min.toString());
      const reward_max = parseFloat(task.reward_max.toString());
      const calculatedReward = parseFloat((reward_min + Math.random() * (reward_max - reward_min)).toFixed(2));

      const userTask = this.userTaskRepo.create({
        user_id: user.id,
        task_id: task.id,
        status: task.task_type === 'manual' ? 'pending' : 'completed',
        reward: calculatedReward,
        reward_received: task.task_type === 'manual' ? 0 : calculatedReward, // Set reward_received based on task type
      });

      this.logger.log(`💰 Assigned reward for task "${task.title}": ${calculatedReward} USDT (range: ${reward_min}-${reward_max})`);

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

        // Get updated user balance
        const updatedUser = await this.userRepo.findOne({ where: { id: user.id } });

        if (updatedUser) {
          await this.sendMessage(
            chatId,
            `✅ *Задание выполнено успешно!*\n\n` +
            `📋 ${task.title}\n` +
            `💰 Награда: *${calculatedReward.toFixed(2)} USDT*\n\n` +
            `━━━━━━━━━━━━━━━━\n` +
            `💳 Текущий баланс: *${updatedUser.balance_usdt.toFixed(2)} USDT*\n` +
            `✨ Выполнено заданий: ${updatedUser.tasks_completed}\n` +
            `📈 Всего заработано: ${updatedUser.total_earned.toFixed(2)} USDT\n\n` +
            `Поздравляем! Средства зачислены на ваш счет. 🎉`,
            await this.getReplyKeyboard(user?.tg_id)
          );
        }
      } else {
        await this.sendMessage(
          chatId,
          `📝 *Задание отправлено на проверку*\n\n` +
          `📋 ${task.title}\n` +
          `💰 Потенциальная награда: *${calculatedReward.toFixed(2)} USDT*\n\n` +
          `⏳ Ожидайте подтверждения администратора.\n` +
          `Мы проверим выполнение в ближайшее время и отправим вам уведомление.\n\n` +
          `📬 Вы получите сообщение о результатах проверки.`,
          await this.getReplyKeyboard(user?.tg_id)
        );
      }
    } catch (error) {
      this.logger.error(`Error handling task command:`, error);
      await this.sendMessage(chatId, 'Произошла ошибка при выполнении задания. Попробуйте позже.', await this.getReplyKeyboard());
    }
  }

  private async sendHelp(chatId: string, user?: User, customResponse?: string) {
    // Double-check: user should not be blocked (safety check)
    if (user && await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
      return;
    }

    // Use custom response if provided, otherwise use default
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

  private async sendAvailableTasks(chatId: string, user: User, customResponse?: string) {
    // Double-check: user should not be blocked (safety check)
    if (await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
      return;
    }

    const tasks = await this.taskRepo.find({ where: { active: true } });

    if (tasks.length === 0) {
      await this.sendMessage(chatId, 'На данный момент нет доступных заданий.', {
        inline_keyboard: [[{ text: '🔙 Главное меню', callback_data: 'menu' }]],
      });
      return;
    }

    // Get user rank for filtering
    const userRank = await this.ranksService.getUserRank(user.id);
    const userRankLevel = userRank.current_rank;
    const hasPlatinum = userRank.platinum_active && userRank.platinum_expires_at && new Date() < userRank.platinum_expires_at;

    // Build message with statistics
    const completedTotal = await this.userTaskRepo.count({
      where: { user_id: user.id, status: 'completed' },
    });

    // Use custom response if provided, otherwise use default
    let message = customResponse ||
      `📋 *Доступные задания*\n\n` +
      `✅ Выполнено: ${completedTotal} заданий\n` +
      `💰 Заработано: ${user.total_earned} USDT\n\n` +
      `Выберите задание:`;

    // Build interactive buttons for each task
    const keyboard: any[] = [];

    for (const task of tasks) {
      // Check if task is available for this user based on available_for setting
      let isAvailableForUser = true;

      if (task.available_for === 'platinum') {
        // Only available for platinum subscribers
        isAvailableForUser = hasPlatinum;
      } else if (task.available_for === 'ranks' && task.target_ranks) {
        // Available only for specific ranks
        try {
          const targetRanks = JSON.parse(task.target_ranks);
          if (Array.isArray(targetRanks)) {
            // If user has platinum, they can access all rank-restricted tasks
            isAvailableForUser = hasPlatinum || targetRanks.includes(userRankLevel);
          }
        } catch (e) {
          this.logger.warn(`Failed to parse target_ranks for task ${task.id}: ${e.message}`);
          // If parsing fails, make task available to all (fallback)
          isAvailableForUser = true;
        }
      }
      // If available_for === 'all' or null/undefined, task is available for everyone

      if (!isAvailableForUser) {
        continue; // Skip this task
      }

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

    // Get user FIRST - before answering callback
    const user = await this.userRepo.findOne({ where: { tg_id: tgId } });
    if (!user) {
      await this.answerCallbackQuery(callback.id, 'Пользователь не найден');
      await this.sendMessage(chatId, 'Пользователь не найден. Используйте /start');
      return;
    }

    // Check for blocked user FIRST - before any callback processing
    if (await this.checkUserBlocked(user)) {
      await this.answerCallbackQuery(callback.id, 'Ваш аккаунт заблокирован');
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
      return; // CRITICAL: Stop processing here
    }

    // Answer callback to remove loading state (only if user is not blocked)
    await this.answerCallbackQuery(callback.id, '⏳ Обработка...');

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
        await this.answerCallbackQuery(callback.id, '❌ Вы не подписаны на все каналы');
        await this.sendMessage(
          chatId,
          `❌ *Вы еще не подписались на все каналы!*\n\n` +
          `Осталось подписаться на:\n` +
          unsubscribedChannels.map((ch, i) => `${i + 1}️⃣ ${ch.title}`).join('\n'),
          this.generateSubscriptionKeyboard(unsubscribedChannels, 'check_subscription'),
        );
      } else {
        // Обновляем статус подписки на каналы для ранга
        await this.ranksService.setChannelsSubscribed(user.id, true);

        // Проверяем возможность повышения ранга
        const rankUpdate = await this.ranksService.checkAndUpdateRank(user.id);

        await this.answerCallbackQuery(callback.id, '✅ Подписка подтверждена!');

        let message = '✅ Отлично! Все подписки подтверждены!';

        // Если пользователь повысил ранг до Бронзы
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

    // Handle different button actions
    // ✅ Handle task-related actions (system functionality)
    else if (data === 'my_tasks') {
      await this.showMyTasks(chatId, user);
    } else if (data.startsWith('task_')) {
      await this.handleTaskAction(chatId, user, data);
    } else if (data.startsWith('start_task_')) {
      await this.startTask(chatId, user, data);
    } else if (data.startsWith('submit_task_')) {
      await this.submitTask(chatId, user, data);
    } else if (data.startsWith('cancel_task_')) {
      await this.cancelTask(chatId, user, data);
    } else if (data.startsWith('verify_')) {
      await this.handleTaskVerification(chatId, user, data);
    }
    // ✅ Handle utility callbacks
    else if (data === 'noop') {
      // Do nothing - just acknowledge the callback
      return;
    } else if (data === 'menu') {
      // Send welcome message (uses greeting_template from settings)
      await this.sendWelcomeMessage(chatId, user);
    }
    // ✅ Handle custom buttons from database (admin panel)
    else {
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

    // ✅ No fallback buttons - all buttons must be configured in admin panel
    if (keyboard.length === 0) {
      this.logger.warn('⚠️ No inline keyboard buttons configured in database. Please add buttons via admin panel.');
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
   * УДАЛЕНО: Все кнопки с командами удалены по запросу пользователя
   * @param userTgId Optional Telegram user ID to check admin status
   */
  private async getReplyKeyboard(userTgId?: string) {
    // ✅ Return empty keyboard - no buttons with commands
    return undefined;
  }

  /**
   * Check if a user is an admin by Telegram ID
   */
  private async isUserAdmin(tgId: string): Promise<boolean> {
    try {
      const admin = await this.adminRepo.findOne({ where: { tg_id: tgId } });
      return !!admin;
    } catch (error) {
      this.logger.error(`Error checking admin status for ${tgId}:`, error.message);
      return false;
    }
  }

  /**
   * Handle Reply Keyboard button clicks
   * Поддерживает кастомные кнопки из БД с mapping на встроенные функции
   */
  private async handleReplyButton(chatId: string, text: string, user: User): Promise<boolean> {
    this.logger.debug(`🔘 Handling reply button: "${text}" from user ${user.tg_id}`);

    // Check for blocked user FIRST - before any button processing
    if (await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
      return true; // Return true to indicate handled (blocked)
    }

    // Try to find custom button from DB
    const button = await this.buttonRepo.findOne({
      where: { label: text, active: true }
    });

    if (button) {
      this.logger.debug(`✅ Found button in DB: ${button.label}, command: ${button.command || 'none'}`);
      // Check if button has a command - all commands come from DB
      if (button.command) {
        // Handle command via handleCommand (checks DB)
        this.logger.debug(`📝 Button has command, calling handleCommand: ${button.command}`);
        await this.handleCommand(chatId, button.command, user);
        return true;
      }

      // Otherwise handle as custom button
      this.logger.debug(`🎯 Button has no command, calling handleCustomButton`);
      await this.handleCustomButton(chatId, user, button);
      return true;
    }

    // Fallback: Handle common button labels that might not be in DB yet
    // This is a temporary fallback until all buttons are properly configured
    const normalizedText = text.trim().toLowerCase();
    this.logger.debug(`🔍 Button not found in DB, checking fallback for: "${normalizedText}"`);

    // Map common button labels to commands/actions
    // Check for "Задания" - be very permissive with matching
    const zadaniyaVariants = ['задания', 'задани', 'заданий', 'заданиe'];
    const matchesZadaniya = zadaniyaVariants.some(variant =>
      normalizedText === variant ||
      normalizedText.includes(variant) ||
      text.toLowerCase().includes(variant)
    );

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
    // ✅ No hardcoded buttons - all buttons must be configured in admin panel
    return false;
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

  async deleteWebhook(dropPendingUpdates: boolean = true) {
    const url = `https://api.telegram.org/bot${this.botToken}/deleteWebhook`;

    try {
      const response = await axios.post(url, {
        drop_pending_updates: dropPendingUpdates,
      });
      this.logger.log('Webhook deleted successfully');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to delete webhook:', error);
      throw error;
    }
  }

  // === NEW METHODS ===

  private async sendBalance(chatId: string, user: User, customResponse?: string) {
    // Double-check: user should not be blocked (safety check)
    if (await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
      return;
    }

    // Use custom response if provided, otherwise use default
    const text = customResponse ||
      `💰 *Ваш баланс*\n\n` +
      `💵 Доступно: *${user.balance_usdt} USDT*\n` +
      `📊 Всего заработано: ${user.total_earned} USDT\n` +
      `✅ Выполнено заданий: ${user.tasks_completed}\n\n` +
      `💸 Для вывода используйте кнопку "*Вывести*" внизу\n` +
      `📋 Выполняйте задания чтобы заработать больше!`;

    await this.sendMessage(chatId, text, await this.getReplyKeyboard());
  }

  private async sendProfile(chatId: string, user: User, customResponse?: string) {
    // Double-check: user should not be blocked (safety check)
    if (await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
      return;
    }

    const refCount = await this.userRepo.count({
      where: { referred_by: user.id },
    });

    // Use custom response if provided, otherwise use default
    const text = customResponse ||
      `*Профиль*\n\n` +
      `💰 Баланс: *${user.balance_usdt} USDT*\n` +
      `📊 Заработано: ${user.total_earned} USDT\n` +
      `✅ Заданий: ${user.tasks_completed}\n` +
      `👥 Рефералов: ${refCount}`;

    await this.sendMessage(chatId, text, await this.getReplyKeyboard());
  }

  private async sendWithdrawInfo(chatId: string, user: User, customResponse?: string) {
    // Double-check: user should not be blocked (safety check)
    if (await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
      return;
    }

    const minWithdraw = await this.settingsService.getValue('min_withdraw_usdt', '10.00');

    if (parseFloat(user.balance_usdt.toString()) < parseFloat(minWithdraw)) {
      await this.sendMessage(
        chatId,
        `❌ *Недостаточно средств для вывода*\n\n` +
        `Минимальная сумма: ${minWithdraw} USDT\n` +
        `Ваш баланс: ${user.balance_usdt} USDT\n\n` +
        `📋 Выполните больше заданий чтобы заработать!`,
        await this.getReplyKeyboard(user?.tg_id),
      );
      return;
    }

    // Use custom response if provided, otherwise use default
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

  private async sendReferralInfo(chatId: string, user: User, customResponse?: string) {
    // Double-check: user should not be blocked (safety check)
    if (await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
      return;
    }

    const refCount = await this.userRepo.count({
      where: { referred_by: user.id },
    });

    const refBonusPercent = await this.settingsService.getValue('ref_bonus_percent', '5.00');
    const botUsername = await this.settingsService.getValue('bot_username', 'yourbot');
    const refLink = `https://t.me/${botUsername}?start=ref${user.tg_id}`;

    // Use custom response if provided, otherwise use default
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

  private async handleTaskAction(chatId: string, user: User, data: string) {
    // Double-check: user should not be blocked (safety check)
    if (await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
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

    // Check if task is available for this user based on available_for setting
    const userRank = await this.ranksService.getUserRank(user.id);
    const userRankLevel = userRank.current_rank;
    const hasPlatinum = userRank.platinum_active && userRank.platinum_expires_at && new Date() < userRank.platinum_expires_at;

    let isAvailableForUser = true;
    if (task.available_for === 'platinum') {
      isAvailableForUser = hasPlatinum;
    } else if (task.available_for === 'ranks' && task.target_ranks) {
      try {
        const targetRanks = JSON.parse(task.target_ranks);
        if (Array.isArray(targetRanks)) {
          isAvailableForUser = hasPlatinum || targetRanks.includes(userRankLevel);
        }
      } catch (e) {
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
    // Double-check: user should not be blocked (safety check)
    if (await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
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

    // Check if task is available for this user based on available_for setting
    const userRank = await this.ranksService.getUserRank(user.id);
    const userRankLevel = userRank.current_rank;
    const hasPlatinum = userRank.platinum_active && userRank.platinum_expires_at && new Date() < userRank.platinum_expires_at;

    let isAvailableForUser = true;
    if (task.available_for === 'platinum') {
      isAvailableForUser = hasPlatinum;
    } else if (task.available_for === 'ranks' && task.target_ranks) {
      try {
        const targetRanks = JSON.parse(task.target_ranks);
        if (Array.isArray(targetRanks)) {
          isAvailableForUser = hasPlatinum || targetRanks.includes(userRankLevel);
        }
      } catch (e) {
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

    // Check completed count before starting
    const completedCount = await this.userTaskRepo.count({
      where: { user_id: user.id, task_id: task.id, status: 'completed' },
    });

    if (completedCount >= task.max_per_user) {
      await this.sendMessage(chatId, '✅ Вы уже выполнили это задание максимальное количество раз', {
        inline_keyboard: [[{ text: '🔙 К заданиям', callback_data: 'tasks' }]],
      });
      return;
    }

    // Check if task is already in progress or submitted
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

    // Create in_progress record
    const userTask = this.userTaskRepo.create({
      user_id: user.id,
      task_id: task.id,
      status: 'in_progress',
      started_at: new Date(),
      reward_received: 0, // Initialize to 0, will be updated when task is completed
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
    // Double-check: user should not be blocked (safety check)
    if (await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
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

    // Check if task is available for this user (double-check)
    const userRank = await this.ranksService.getUserRank(user.id);
    const userRankLevel = userRank.current_rank;
    const hasPlatinum = userRank.platinum_active && userRank.platinum_expires_at && new Date() < userRank.platinum_expires_at;

    let isAvailableForUser = true;
    if (task.available_for === 'platinum') {
      isAvailableForUser = hasPlatinum;
    } else if (task.available_for === 'ranks' && task.target_ranks) {
      try {
        const targetRanks = JSON.parse(task.target_ranks);
        if (Array.isArray(targetRanks)) {
          isAvailableForUser = hasPlatinum || targetRanks.includes(userRankLevel);
        }
      } catch (e) {
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

    // Calculate base reward (random value between min and max)
    const reward_min = parseFloat(task.reward_min.toString());
    const reward_max = parseFloat(task.reward_max.toString());
    const baseReward = parseFloat((reward_min + Math.random() * (reward_max - reward_min)).toFixed(2));

    // Apply rank bonus (userRank already declared above)
    const reward = this.ranksService.applyRankBonus(baseReward, parseFloat(userRank.bonus_percentage.toString()));

    this.logger.log(`💰 Calculated reward for task "${task.title}": ${baseReward} USDT (base) -> ${reward} USDT (with +${userRank.bonus_percentage}% rank bonus)`);

    // Check if task requires manual review
    // - task_type = 'manual' always requires review
    // - high reward tasks (> 50 USDT) require review
    const requiresManualReview = task.task_type === 'manual' || task.reward_max > 50;

    if (requiresManualReview) {
      // Submit for manual review
      userTask.status = 'submitted';
      userTask.reward = reward;
      userTask.reward_received = 0; // Will be updated when task is approved
      userTask.submitted_at = new Date();
      await this.userTaskRepo.save(userTask);

      await this.sendMessage(
        chatId,
        `📝 *Задание отправлено на модерацию*\n\n` +
        `📋 ${task.title}\n` +
        `💰 Потенциальная награда: *${reward.toFixed(2)} USDT*\n\n` +
        `━━━━━━━━━━━━━━━━\n` +
        `⏳ *Статус:* На проверке\n` +
        `📬 Мы проверим выполнение задания в ближайшее время.\n\n` +
        `✅ При успешной проверке средства будут зачислены на ваш счет.\n` +
        `❌ В случае отклонения вы получите уведомление с причиной.`,
        {
          inline_keyboard: [[{ text: '🔙 К заданиям', callback_data: 'tasks' }]],
        },
      );

      // TODO: Notify admin about new submission
    } else {
      // Auto-approve
      userTask.status = 'completed';
      userTask.reward = reward;
      userTask.reward_received = reward; // Set reward_received when task is completed
      userTask.completed_at = new Date();
      await this.userTaskRepo.save(userTask);

      // Update user balance and stats (convert to number to avoid string concatenation)
      const balanceBefore = parseFloat(user.balance_usdt.toString());
      const balanceAfter = balanceBefore + reward;

      user.balance_usdt = balanceAfter;
      user.total_earned = parseFloat(user.total_earned.toString()) + reward;
      user.tasks_completed = user.tasks_completed + 1;
      await this.userRepo.save(user);

      // Update rank tasks counter and check for rank up
      await this.ranksService.incrementTasksCompleted(user.id);
      const rankUpdate = await this.ranksService.checkAndUpdateRank(user.id);

      // Если пользователь повысил ранг
      if (rankUpdate.leveledUp) {
        const rankNames = { stone: 'Камень', bronze: 'Бронза', silver: 'Серебро', gold: 'Золото', platinum: 'Платина' };
        const rankEmojis = { stone: '🪨', bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' };

        setTimeout(() => {
          this.sendMessage(
            chatId,
            `🎉 *Поздравляем!*\n\n` +
            `${rankEmojis[rankUpdate.newLevel!]} Ты достиг ранга *${rankNames[rankUpdate.newLevel!]}*!\n\n` +
            `💰 Новый бонус: *+${rankUpdate.rank.bonus_percentage}%* ко всем наградам!\n\n` +
            (rankUpdate.newLevel === 'gold' ? `💎 Теперь доступна Платиновая подписка!\nИспользуй !premium_info для подробностей` : ''),
          ).catch(err => this.logger.error('Failed to send rank up notification:', err));
        }, 2000);
      }

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
        `✅ *Задание выполнено успешно!*\n\n` +
        `📋 ${task.title}\n` +
        `💰 Награда: *+${reward.toFixed(2)} USDT*\n\n` +
        `━━━━━━━━━━━━━━━━\n` +
        `💳 Текущий баланс: *${balanceAfter.toFixed(2)} USDT*\n` +
        `✨ Выполнено заданий: ${user.tasks_completed}\n` +
        `📈 Всего заработано: ${user.total_earned.toFixed(2)} USDT\n\n` +
        `Поздравляем! Средства зачислены на ваш счет. 🎉`,
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
    // Double-check: user should not be blocked (safety check)
    if (await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
      return;
    }

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
    // Double-check: user should not be blocked (safety check)
    if (await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
      return;
    }

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
    // Double-check: user should not be blocked (safety check)
    if (await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
      return;
    }

    // Handle custom button from database based on action_type
    let text = 'Информация';
    let keyboard: any = { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'menu' }]] };

    // PRIORITY 1: Check for function mode FIRST (before command check)
    // This prevents function buttons from being treated as commands
    if (button.action_payload?.script || button.action_payload?.webhook_url || button.action_payload?.function_name) {
      try {
        if (button.action_payload.script) {
          // Execute script
          this.logger.log(`Executing script for button ${button.id}`);

          let scriptCode = button.action_payload.script;
          if (typeof scriptCode !== 'string') {
            scriptCode = String(scriptCode);
          }
          scriptCode = scriptCode.trim();

          // Remove any escape sequences that might have been added during storage
          // If the script was stored with escaped backticks, we need to unescape them
          // Replace \\` with ` (unescape escaped backticks)
          scriptCode = scriptCode.replace(/\\`/g, '`');
          // Replace \\${ with ${ (unescape escaped template literal expressions)
          scriptCode = scriptCode.replace(/\\\$\{/g, '${');

          // Log the full script for debugging
          this.logger.log(`Script code (length: ${scriptCode.length}):`, scriptCode);

          // Check if script looks like JavaScript code (contains function, return, const, let, var, if, etc.)
          const isJavaScriptCode = /(function|=>|return|const|let|var|if|for|while|switch|class|async|await)/i.test(scriptCode);

          if (!isJavaScriptCode) {
            // Treat as simple template - replace variables and use as text
            text = scriptCode
              .replace(/{username}/g, user.username || user.first_name || 'Друг')
              .replace(/{balance}/g, user.balance_usdt.toString())
              .replace(/{tasks_completed}/g, user.tasks_completed.toString())
              .replace(/{chat_id}/g, chatId)
              .replace(/{user_id}/g, user.tg_id);
          } else {
            // It's JavaScript code - execute it
            // Create user data object for script context
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

            // Use Function constructor with string concatenation to avoid template literal issues
            // Declare functionBody outside try block so it's accessible in catch
            let functionBody: string = '';
            try {
              // Prepare context data as JSON strings (already escaped by JSON.stringify)
              const userJsonStr = JSON.stringify(userData);
              const userIdStr = JSON.stringify(user.tg_id);
              const chatIdStr = JSON.stringify(chatId);
              const buttonDataStr = JSON.stringify({
                id: button.id,
                label: button.label || '',
                action: 'execute',
                // Add command if available for better identification
                command: button.command || null
              });

              // Log buttonData for debugging
              this.logger.log(`ButtonData being passed to script:`, {
                id: button.id,
                label: button.label || '',
                action: 'execute',
                command: button.command || null
              });

              // Build the function body using string concatenation (not template literals)
              // The issue: scriptCode may contain backticks (`) and ${} which break string concatenation
              // Solution: Use Function constructor with the script code directly
              // We need to properly escape the script for safe insertion

              // The problem: when we use JSON.stringify, we get a string in quotes
              // and new Function(string) creates a function with body = that string, not executing it
              // Solution: Use Function constructor with the script code directly (not as JSON string)
              // But we need to escape backticks properly for string concatenation

              // When using string concatenation with single quotes, we don't need to escape backticks
              // Backticks inside a string created with single quotes are treated as literal characters
              // However, we still need to escape backslashes and newlines for proper string representation
              // But wait - we're not putting the script in quotes, we're inserting it directly as code
              // So we don't need to escape anything - just insert the script as-is
              // The script will be part of the function body, not a string literal

              // Insert the script directly into the function body
              // Template literals in the script will work correctly when executed

              // Log scriptCode before insertion to verify it's correct
              this.logger.log(`ScriptCode before insertion (length: ${scriptCode.length}):`, scriptCode);
              this.logger.log(`ScriptCode type: ${typeof scriptCode}, is empty: ${!scriptCode || scriptCode.length === 0}`);

              // Build functionBody step by step to debug
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

              // Ensure scriptCode ends with a newline and has proper closing braces
              // Check if scriptCode defines a function but doesn't close it properly
              let processedScriptCode = scriptCode.trim();

              // Count opening and closing braces for functions
              const functionMatches = processedScriptCode.match(/function\s+\w+\s*\(/g);
              if (functionMatches) {
                // Count opening braces {
                const openBraces = (processedScriptCode.match(/{/g) || []).length;
                // Count closing braces }
                const closeBraces = (processedScriptCode.match(/}/g) || []).length;

                // If there are more opening braces than closing, add missing closing braces
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

              // Combine all parts
              functionBody = part1 + part2 + part3;

              this.logger.log(`FunctionBody total length: ${functionBody.length}, part1: ${part1.length}, part2: ${part2.length}, part3: ${part3.length}`);

              // Log functionBody after scriptCode insertion to verify it's correct
              this.logger.log(`FunctionBody after scriptCode insertion (length: ${functionBody.length}):`, functionBody.substring(0, 1000));
              // Also log the part where scriptCode should be (around position 500-800)
              const scriptPosition = functionBody.indexOf('// User script code');
              if (scriptPosition >= 0) {
                this.logger.log(`FunctionBody around scriptCode (position ${scriptPosition}, 500 chars):`, functionBody.substring(scriptPosition, scriptPosition + 500));
                // Also log what comes after scriptCode to see if it's complete
                const afterScriptPosition = scriptPosition + 500;
                if (afterScriptPosition < functionBody.length) {
                  this.logger.log(`FunctionBody after scriptCode (position ${afterScriptPosition}, 200 chars):`, functionBody.substring(afterScriptPosition, afterScriptPosition + 200));
                }
              } else {
                this.logger.error(`ERROR: "// User script code" not found in functionBody!`);
              }

              // Log the full functionBody to a file-like structure for debugging
              // Split by lines and log each line to see the exact structure
              const functionBodyLines = functionBody.split('\n');
              this.logger.log(`FunctionBody total lines: ${functionBodyLines.length}`);
              // Log lines around scriptCode position
              const scriptLineIndex = functionBodyLines.findIndex(line => line.includes('// User script code'));
              if (scriptLineIndex >= 0) {
                const startLine = Math.max(0, scriptLineIndex - 5);
                const endLine = Math.min(functionBodyLines.length, scriptLineIndex + 20);
                this.logger.log(`FunctionBody lines ${startLine}-${endLine}:`, functionBodyLines.slice(startLine, endLine).join('\n'));
              }

              // Log the function body for debugging (first 2000 chars and last 200 chars)
              this.logger.log(`Function body (first 2000 chars, total length: ${functionBody.length}):`, functionBody.substring(0, 2000));
              if (functionBody.length > 2000) {
                this.logger.log(`Function body (last 200 chars):`, functionBody.substring(functionBody.length - 200));
                // Also log the middle part around the 2000 char mark to see what's there
                const middleStart = Math.max(0, 2000 - 100);
                const middleEnd = Math.min(functionBody.length, 2000 + 100);
                this.logger.log(`Function body (around 2000 chars, ${middleStart}-${middleEnd}):`, functionBody.substring(middleStart, middleEnd));
              }

              // Create and execute the function
              // First, validate the function body syntax
              try {
                // Try to parse the function body to catch syntax errors early
                new Function(functionBody);
              } catch (parseError: any) {
                this.logger.error(`Function body syntax error:`, parseError);
                this.logger.error(`Function body (first 1000 chars):`, functionBody.substring(0, 1000));
                // Log the full function body in chunks to see the exact issue
                this.logger.error(`Function body (full, length: ${functionBody.length}):`);
                // Log in chunks of 500 chars to avoid truncation
                for (let i = 0; i < functionBody.length; i += 500) {
                  const chunk = functionBody.substring(i, i + 500);
                  this.logger.error(`Function body chunk [${i}-${i + 500}]:`, chunk);
                }
                throw new Error(`Синтаксическая ошибка в скрипте: ${parseError.message}`);
              }

              const scriptFunction = new Function(functionBody);
              const result = scriptFunction();

              // Replace variables in the result if it's a string
              if (typeof result === 'string') {
                text = result
                  .replace(/{username}/g, user.username || user.first_name || 'Друг')
                  .replace(/{balance}/g, user.balance_usdt.toString())
                  .replace(/{tasks_completed}/g, user.tasks_completed.toString())
                  .replace(/{chat_id}/g, chatId)
                  .replace(/{user_id}/g, user.tg_id);
              } else if (result && typeof result === 'object') {
                // If result is an object with message property, use it
                if (result.message) {
                  text = result.message;
                } else {
                  text = JSON.stringify(result);
                }
              } else {
                text = result ? String(result) : '✅ Скрипт выполнен';
              }
            } catch (scriptError: any) {
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
        } else if (button.action_payload.webhook_url) {
          // Call webhook
          this.logger.log(`Calling webhook for button ${button.id}: ${button.action_payload.webhook_url}`);

          const axios = require('axios');
          const timeout = button.action_payload.timeout || 5000;

          try {
            const response = await axios.post(
              button.action_payload.webhook_url,
              {
                user: {
                  id: user.id,
                  tg_id: user.tg_id,
                  username: user.username,
                  first_name: user.first_name,
                  balance: user.balance_usdt,
                },
                chatId: chatId,
                buttonId: button.id,
              },
              { timeout }
            );

            text = response.data?.message || response.data?.text || '✅ Функция выполнена успешно';
          } catch (webhookError: any) {
            this.logger.error(`Webhook error for button ${button.id}:`, webhookError);
            text = `❌ Ошибка вызова webhook: ${webhookError.message}`;
          }
        } else if (button.action_payload.function_name) {
          // Call internal function
          this.logger.log(`Calling internal function for button ${button.id}: ${button.action_payload.function_name}`);

          // Map function names to actual methods
          const functionMap: { [key: string]: () => Promise<void> } = {
            'sendProfile': () => this.sendProfile(chatId, user),
            'sendBalance': () => this.sendBalance(chatId, user),
            'sendTasks': () => this.sendAvailableTasks(chatId, user),
            'sendReferralInfo': () => this.sendReferralInfo(chatId, user),
          };

          const func = functionMap[button.action_payload.function_name];
          if (func) {
            await func();
            return; // Function already sends message
          } else {
            text = `❌ Функция "${button.action_payload.function_name}" не найдена`;
          }
        }

        // Send the result
        await this.sendMessage(chatId, text, keyboard);
        return;
      } catch (error: any) {
        this.logger.error(`Error executing function for button ${button.id}:`, error);
        await this.sendMessage(chatId, `❌ Ошибка выполнения функции: ${error.message}`, keyboard);
        return;
      }
    }

    // PRIORITY 2: If button has a command in action_payload.command, handle it in switch-case below
    // If button has a direct command field, execute it first (legacy support)
    if (button.command && !button.action_payload?.command) {
      this.logger.log(`Executing command from button ${button.id}: ${button.command}`);
      await this.handleCommand(chatId, button.command, user);
      // If button has only command and no other content, return early
      if (!button.action_payload && !button.media_url) {
        return;
      }
    }

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
      // Remove leading slash if present for comparison
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
        case 'profile':
          await this.sendProfile(chatId, user);
          return; // sendProfile already sends message
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
          // Для неизвестных команд просто не отправляем сообщение "в разработке"
          // Вместо этого вызываем handleCommand, чтобы обработать команду стандартным способом
          // Это позволит обработать команды, которые уже реализованы в handleCommand
          const commandText = command.startsWith('/') ? command : `/${command}`;
          await this.handleCommand(chatId, commandText, user);
          return; // handleCommand already sends message
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

  private async handleCustomCommand(chatId: string, user: User, command: any) {
    // Double-check: user should not be blocked (safety check)
    if (await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
      return;
    }

    const actionType = command.action_type || 'text';
    const payload = command.action_payload || {};

    // Handle different action types
    if (actionType === 'function' && payload.type === 'script' && payload.script) {
      // Execute script (similar to button script execution)
      try {
        this.logger.log(`Executing script for command ${command.id}`);

        let scriptCode = payload.script;
        if (typeof scriptCode !== 'string') {
          scriptCode = String(scriptCode);
        }
        scriptCode = scriptCode.trim();

        // Unescape template literals
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

        let functionBody: string = '';
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

          // Check for missing closing braces
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
          } else {
            await this.sendMessage(chatId, 'Script executed successfully', await this.getReplyKeyboard());
          }
        } catch (error: any) {
          this.logger.error(`Error executing command script: ${error.message}`, error.stack);
          await this.sendMessage(chatId, `❌ Ошибка выполнения команды: ${error.message}`, await this.getReplyKeyboard());
        }
      } catch (error: any) {
        this.logger.error(`Error in handleCustomCommand script: ${error.message}`, error.stack);
        await this.sendMessage(chatId, `❌ Ошибка: ${error.message}`, await this.getReplyKeyboard());
      }
      return;
    }

    if (actionType === 'function' && payload.type === 'webhook' && payload.url) {
      // Execute webhook
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
        } else {
          await this.sendMessage(chatId, '❌ Ошибка выполнения webhook', await this.getReplyKeyboard());
        }
      } catch (error: any) {
        this.logger.error(`Error executing webhook: ${error.message}`);
        await this.sendMessage(chatId, `❌ Ошибка webhook: ${error.message}`, await this.getReplyKeyboard());
      }
      return;
    }

    if (actionType === 'function' && payload.type === 'internal' && payload.function_name) {
      // Execute internal function
      const functionName = payload.function_name;
      if (functionName === 'sendBalance') {
        await this.sendBalance(chatId, user);
      } else if (functionName === 'sendTasks') {
        await this.sendAvailableTasks(chatId, user);
      } else if (functionName === 'sendRankInfo') {
        await this.sendRankInfo(chatId, user);
      } else if (functionName === 'sendProfile') {
        await this.sendProfile(chatId, user);
      } else {
        await this.sendMessage(chatId, `❌ Неизвестная внутренняя функция: ${functionName}`, await this.getReplyKeyboard());
      }
      return;
    }

    if (actionType === 'command' && payload.command) {
      // Execute another command
      const commandText = payload.command.startsWith('/') ? payload.command : `/${payload.command}`;
      await this.handleCommand(chatId, commandText, user);
      return;
    }

    if (actionType === 'url' && payload.url) {
      // Send URL with inline button
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
      // Send media with optional text
      const text = payload.text || '';
      const mediaUrl = payload.media_url;
      const caption = payload.caption || text;
      await this.sendMessageWithMedia(chatId, caption, mediaUrl);
      return;
    }

    // Default: text mode (or legacy format)
    let text = payload.text || command.response || '';
    if (text) {
      text = text
        .replace(/{username}/g, user.username || user.first_name || 'Друг')
        .replace(/{balance}/g, user.balance_usdt.toString())
        .replace(/{tasks_completed}/g, user.tasks_completed.toString())
        .replace(/{chat_id}/g, chatId)
        .replace(/{user_id}/g, user.tg_id);

      // Send with media if available (legacy support)
      if (command.media_url) {
        await this.sendMessageWithMedia(chatId, text, command.media_url);
      } else {
        await this.sendMessage(chatId, text, await this.getReplyKeyboard());
      }
    }
  }

  private async handleTaskVerification(chatId: string, user: User, data: string) {
    // Double-check: user should not be blocked (safety check)
    if (await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
      return;
    }

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
    // Double-check: user should not be blocked (safety check)
    if (await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
      return;
    }

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
        where: { active: true },
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
    // Double-check: user should not be blocked (safety check)
    if (await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
      return;
    }

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

  /**
   * Отправить информацию о ранге пользователя
   */
  private async sendRankInfo(chatId: string, user: User) {
    // Double-check: user should not be blocked (safety check)
    if (await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
      return;
    }

    // Проверяем статус подписки на каналы
    const { allSubscribed } = await this.checkMandatoryChannels(user.tg_id);

    // Проверяем и обновляем ранг перед отображением (синхронизируем счетчики)
    // Передаем статус подписки на каналы для правильной проверки
    const rankUpdateResult = await this.ranksService.checkAndUpdateRank(user.id, allSubscribed);

    // Если ранг повысился, показываем уведомление
    if (rankUpdateResult.leveledUp) {
      const rankNames = { stone: 'Камень', bronze: 'Бронза', silver: 'Серебро', gold: 'Золото', platinum: 'Платина' };
      const rankEmojis = { stone: '🪨', bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' };

      await this.sendMessage(
        chatId,
        `🎉 *Поздравляем!*\n\n` +
        `${rankEmojis[rankUpdateResult.newLevel!]} Ты достиг ранга *${rankNames[rankUpdateResult.newLevel!]}*!\n\n` +
        `💰 Новый бонус: *+${rankUpdateResult.rank.bonus_percentage}%* ко всем наградам!\n\n` +
        `Продолжай выполнять задания для дальнейшего повышения!`,
        await this.getReplyKeyboard(user?.tg_id),
      );
    }

    // Получаем обновленные данные ранга и прогресса
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

      // Для Бронзы показываем информацию о подписке на каналы
      if (progress.nextRank === 'bronze') {
        if (progress.channelsSubscribed) {
          text += `✅ Подписка на каналы: *Выполнено*\n\n`;
          text += `🎉 Ты готов к повышению до Бронзы!\n`;
          text += `Продолжай выполнять задания для автоматического повышения.\n\n`;
        } else {
          text += `📢 Подписка на каналы: *Не выполнено*\n`;
          text += `Подпишись на обязательные каналы для получения ранга Бронза.\n\n`;
        }
      } else {
        // Для остальных рангов показываем задания и рефералов
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

  /**
   * Обработчик команды !premium_info
   */
  private async handlePremiumInfo(chatId: string, user: User) {
    // Double-check: user should not be blocked (safety check)
    if (await this.checkUserBlocked(user)) {
      await this.sendMessage(
        chatId,
        '🔒 *Ваш аккаунт заблокирован*\n\n' +
        'Ваш аккаунт был заблокирован администратором.\n\n' +
        'Для получения дополнительной информации обратитесь в поддержку.\n\n' +
        '_Доступ к боту временно ограничен._',
      );
      return;
    }

    const userRank = await this.ranksService.getUserRank(user.id);
    const settings = await this.ranksService.getSettings();

    if (userRank.current_rank === 'stone' || userRank.current_rank === 'bronze') {
      await this.sendMessage(
        chatId,
        '⚠️ *Платиновая подписка доступна с уровня Серебро.*\n\n' +
        'Продолжай выполнять задания и приглашать рефералов для повышения ранга!',
        await this.getReplyKeyboard(user?.tg_id),
      );
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
    } else {
      text += '\n💎 Используй !upgrade для оформления подписки';
    }

    await this.sendMessage(chatId, text, await this.getReplyKeyboard());
  }

  /**
   * Обработчик команды !upgrade
   */
  private async handleUpgrade(chatId: string, user: User) {
    const userRank = await this.ranksService.getUserRank(user.id);
    const settings = await this.ranksService.getSettings();

    // Проверка уровня
    if (userRank.current_rank !== 'gold' && userRank.current_rank !== 'platinum') {
      await this.sendMessage(
        chatId,
        '⚠️ *Платиновая подписка доступна только с уровня Золото*\n\n' +
        'Продолжай выполнять задания для повышения ранга!\n\n' +
        'Используй /rank чтобы посмотреть свой прогресс.',
        await this.getReplyKeyboard(user?.tg_id),
      );
      return;
    }

    // Проверка активной подписки
    if (userRank.platinum_active && userRank.platinum_expires_at) {
      const daysLeft = Math.ceil((new Date(userRank.platinum_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      await this.sendMessage(
        chatId,
        `💎 *У тебя уже активна Платиновая подписка!*\n\n` +
        `⏰ Действует еще ${daysLeft} дней\n\n` +
        `Продление будет доступно за 3 дня до окончания.`,
        await this.getReplyKeyboard(user?.tg_id),
      );
      return;
    }

    // Проверка статистики
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

    // Сохранить состояние ожидания выбора способа оплаты
    // (в реальной реализации нужно использовать state machine или сессии)
  }

  /**
   * Обработать выбор способа оплаты (вызывается когда пользователь отправляет 1/2/3)
   */
  private async handlePaymentMethodChoice(chatId: string, user: User, choice: string) {
    const settings = await this.ranksService.getSettings();

    switch (choice) {
      case '1':
        // Оплата с баланса
        const result = await this.premiumService.processBalancePayment(user.id);

        if (result.success) {
          await this.sendMessage(
            chatId,
            `✅ *Оплата прошла успешно!*\n\n` +
            `💎 Твоя Платиновая подписка активирована на ${settings.platinum_duration_days} дней\n\n` +
            `🎁 *Твои преимущества:*\n` +
            `• Бонус +${settings.platinum_bonus}% на все задания\n` +
            `• Персональный менеджер: @${settings.manager_username}\n` +
            `• Доступ к VIP-заданиям\n` +
            `• Приоритетная поддержка\n\n` +
            `Добро пожаловать в элиту! 🎉`,
            await this.getReplyKeyboard(user?.tg_id),
          );
        } else {
          await this.sendMessage(
            chatId,
            `❌ ${result.message}\n\n` +
            `Пополни баланс или выбери оплату в рублях/гривнах.\n\n` +
            `Используй !upgrade чтобы попробовать снова.`,
            await this.getReplyKeyboard(user?.tg_id),
          );
        }
        break;

      case '2':
        // Оплата рублями
        const rubRequest = await this.premiumService.createRequest(user.id, 'rub_requisites' as any);
        await this.sendMessage(
          chatId,
          `✅ *Отлично!*\n\n` +
          `📝 Твой запрос №*${rubRequest.request_number}* принят.\n\n` +
          `👨‍💼 Менеджер свяжется с тобой в этом же чате для отправки реквизитов в рублях.\n\n` +
          `⏳ Ожидай сообщения в течение 10 минут!`,
          await this.getReplyKeyboard(user?.tg_id),
        );
        // TODO: Уведомить админа о новом запросе
        break;

      case '3':
        // Оплата гривнами
        const uahRequest = await this.premiumService.createRequest(user.id, 'uah_requisites' as any);
        await this.sendMessage(
          chatId,
          `✅ *Отлично!*\n\n` +
          `📝 Твой запрос №*${uahRequest.request_number}* принят.\n\n` +
          `👨‍💼 Менеджер свяжется с тобой в этом же чате для отправки реквизитов в гривнах.\n\n` +
          `⏳ Ожидай сообщения в течение 10 минут!`,
          await this.getReplyKeyboard(user?.tg_id),
        );
        // TODO: Уведомить админа о новом запросе
        break;

      default:
        await this.sendMessage(
          chatId,
          '❌ Неверный выбор. Пожалуйста, введи 1, 2 или 3.\n\n' +
          'Используй !upgrade чтобы попробовать снова.',
          await this.getReplyKeyboard(user?.tg_id),
        );
    }
  }
}

