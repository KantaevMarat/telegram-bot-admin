import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import axios from 'axios';
import { BroadcastService } from './broadcast.service';

@Processor('broadcast')
export class BroadcastProcessor extends WorkerHost {
  private readonly logger = new Logger(BroadcastProcessor.name);
  private botToken: string = '';

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => BroadcastService))
    private broadcastService: BroadcastService,
  ) {
    super();
    // Use CLIENT_BOT_TOKEN for client bot (user-facing), fallback to TELEGRAM_BOT_TOKEN
    const clientToken = this.configService.get('CLIENT_BOT_TOKEN');
    const telegramToken = this.configService.get('TELEGRAM_BOT_TOKEN');
    this.botToken = clientToken || telegramToken || '';
    
    if (clientToken) {
      this.logger.log(`✅ Using CLIENT_BOT_TOKEN for broadcast (${clientToken.substring(0, 10)}...)`);
    } else if (telegramToken) {
      this.logger.log(`⚠️ Using TELEGRAM_BOT_TOKEN as fallback for broadcast (${telegramToken.substring(0, 10)}...)`);
    } else {
      this.logger.error('⚠️ Neither CLIENT_BOT_TOKEN nor TELEGRAM_BOT_TOKEN is set for broadcast!');
    }
  }

  async process(job: Job<any>): Promise<any> {
    const { broadcastId, users, text, media_urls } = job.data;

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        await this.sendMessage(user.tg_id, text, media_urls);
        successCount++;
      } catch (error) {
        this.logger.error(`Failed to send to user ${user.tg_id}:`, error.message);
        errorCount++;
      }
    }

    this.logger.log(`Batch completed: ${successCount} success, ${errorCount} errors`);

    // Обновляем счетчики в broadcast
    if (broadcastId) {
      await this.broadcastService.updateBroadcastProgress(broadcastId, successCount, errorCount);
    }

    return { successCount, errorCount };
  }

  private async sendMessage(chatId: string, text: string, mediaUrls?: string[]) {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    await axios.post(url, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });

    // Send media if provided
    if (mediaUrls && mediaUrls.length > 0) {
      for (const mediaUrl of mediaUrls) {
        await this.sendMedia(chatId, mediaUrl);
      }
    }
  }

  private async sendMedia(chatId: string, mediaUrl: string) {
    // Determine media type from URL
    const ext = mediaUrl.split('.').pop()?.toLowerCase() || '';
    let method = 'sendPhoto';

    if (['mp4', 'mov', 'avi'].includes(ext)) {
      method = 'sendVideo';
    } else if (['pdf', 'doc', 'docx'].includes(ext)) {
      method = 'sendDocument';
    }

    const url = `https://api.telegram.org/bot${this.botToken}/${method}`;

    await axios.post(url, {
      chat_id: chatId,
      [method === 'sendPhoto' ? 'photo' : method === 'sendVideo' ? 'video' : 'document']: mediaUrl,
    });
  }
}
