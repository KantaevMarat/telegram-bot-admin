import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import axios from 'axios';
import FormData from 'form-data';
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
    // Use CLIENT_TG_BOT_TOKEN for client bot (user-facing)
    const clientToken = this.configService.get('CLIENT_TG_BOT_TOKEN') || this.configService.get('CLIENT_BOT_TOKEN');
    this.botToken = clientToken || '';
    
    if (clientToken) {
      this.logger.log(`✅ Using CLIENT_TG_BOT_TOKEN for broadcast (${clientToken.substring(0, 10)}...)`);
    } else {
      this.logger.error('⚠️ CLIENT_TG_BOT_TOKEN is not set for broadcast!');
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
    try {
      this.logger.debug(`📨 Sending message to ${chatId}, hasMedia: ${!!mediaUrls}, mediaCount: ${mediaUrls?.length || 0}`);
      
      // If there's media, send text as caption to the first media
      if (mediaUrls && mediaUrls.length > 0) {
        this.logger.debug(`📤 Sending ${mediaUrls.length} media file(s) to ${chatId}`);
        
        // Send first media with text as caption
        await this.sendMedia(chatId, mediaUrls[0], text);
        
        // Send remaining media without caption
        for (let i = 1; i < mediaUrls.length; i++) {
          await this.sendMedia(chatId, mediaUrls[i]);
        }
      } else {
        // If no media, send text as regular message
        if (text) {
          const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
          this.logger.debug(`📤 Sending text message to ${chatId}`);
          
          const response = await axios.post(url, {
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
          });
          
          this.logger.debug(`✅ Text message sent to ${chatId}`);
          return response.data;
        }
      }
    } catch (error: any) {
      this.logger.error(`❌ Failed to send message to ${chatId}:`, {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        hasMedia: !!mediaUrls,
        mediaCount: mediaUrls?.length || 0,
      });
      throw error;
    }
  }

  private async sendMedia(chatId: string, mediaUrl: string, caption?: string) {
    try {
      this.logger.debug(`📤 Sending media to ${chatId}: ${mediaUrl}`);
      
      // Determine media type from URL
      const ext = mediaUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
      let method = 'sendPhoto';
      let mediaField = 'photo';

      if (['mp4', 'mov', 'avi', 'webm', 'ogg'].includes(ext)) {
        method = 'sendVideo';
        mediaField = 'video';
      } else if (['pdf', 'doc', 'docx', 'txt', 'zip', 'rar'].includes(ext)) {
        method = 'sendDocument';
        mediaField = 'document';
      }

      this.logger.debug(`📤 Using method: ${method}, field: ${mediaField}`);

      // Download file from MinIO/internal URL
      this.logger.debug(`📥 Downloading media from: ${mediaUrl}`);
      const fileResponse = await axios.get(mediaUrl, {
        responseType: 'stream',
        timeout: 30000, // 30 seconds timeout
      });

      // Create form data
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append(mediaField, fileResponse.data, {
        filename: `file.${ext}`,
        contentType: fileResponse.headers['content-type'] || 'application/octet-stream',
      });

      // Add caption if provided (and not empty)
      if (caption && caption.trim()) {
        formData.append('caption', caption);
        formData.append('parse_mode', 'HTML');
      }

      const url = `https://api.telegram.org/bot${this.botToken}/${method}`;
      this.logger.debug(`📤 Sending to Telegram API: ${url} (multipart/form-data)`);

      const response = await axios.post(url, formData, {
        headers: formData.getHeaders(),
        timeout: 60000, // 60 seconds timeout for file upload
      });
      
      this.logger.log(`✅ Media sent successfully to ${chatId}: ${method}`);
      this.logger.debug(`📤 Response: ${JSON.stringify(response.data)}`);
      
      return response.data;
    } catch (error: any) {
      this.logger.error(`❌ Failed to send media to ${chatId}:`, {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        mediaUrl: mediaUrl.substring(0, 100),
        stack: error.stack,
      });
      throw error;
    }
  }
}
