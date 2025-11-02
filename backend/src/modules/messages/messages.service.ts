import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../../entities/message.entity';
import { User } from '../../entities/user.entity';
import { SyncService } from '../sync/sync.service';
import { BotService } from '../bot/bot.service';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private syncService: SyncService,
    @Inject(forwardRef(() => BotService))
    private botService: BotService,
  ) {}

  async getChats() {
    // Get users with messages
    const chats = await this.userRepo
      .createQueryBuilder('user')
      .leftJoin('user.messages', 'message')
      .select([
        'user.id',
        'user.tg_id',
        'user.username',
        'user.first_name',
        'MAX(message.created_at) as last_message_time',
      ])
      .addSelect(
        'SUM(CASE WHEN message.from_admin_tg_id IS NULL AND message.is_read = false THEN 1 ELSE 0 END)',
        'unread_count',
      )
      .groupBy('user.id')
      .having('MAX(message.created_at) IS NOT NULL')
      .orderBy('last_message_time', 'DESC')
      .getRawMany();

    return chats;
  }

  async getMessages(userId: string, limit = 100) {
    const messages = await this.messageRepo.find({
      where: { user_id: userId },
      order: { created_at: 'ASC' },
      take: limit,
    });

    // Mark messages as read and update status
    (await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ 
        is_read: true,
        status: 'read',
        read_at: () => 'CURRENT_TIMESTAMP'
      })
      .where('user_id = :userId AND from_admin_tg_id IS NULL AND is_read = false', { userId })
      .execute()) as any;

    // Update admin messages status to delivered if not already read
    (await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ 
        status: 'delivered',
        delivered_at: () => 'CURRENT_TIMESTAMP'
      })
      .where('user_id = :userId AND from_admin_tg_id IS NOT NULL AND status = :status', { 
        userId, 
        status: 'sent' 
      })
      .execute()) as any;

    return messages;
  }

  async sendMessage(userId: string, text: string | undefined, adminTgId: string, mediaUrl?: string) {
    const message = this.messageRepo.create({
      user_id: userId,
      from_admin_tg_id: adminTgId,
      text: text || '', // Ensure text is never undefined
      media_url: mediaUrl,
      is_read: true, // Admin messages are auto-read
      status: 'sent', // Initial status
    });

    const savedMessage = await this.messageRepo.save(message);
    
    // 🔄 Publish sync event
    await this.syncService.publish('messages.created', { 
      id: savedMessage.id, 
      userId,
      fromAdmin: true 
    });

    // 📱 Send message to Telegram user
    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (user && user.tg_id) {
        this.logger.log(`Sending message to Telegram user ${user.tg_id}`);
        
        const messageText = text || '';
        
        if (mediaUrl) {
          // Отправка с медиа
          await this.botService.sendMessageWithMedia(user.tg_id, messageText, mediaUrl);
        } else if (messageText) {
          // Обычное сообщение (только если есть текст)
          await this.botService.sendMessage(user.tg_id, messageText);
        }
        
        this.logger.log(`✅ Message sent to Telegram user ${user.tg_id}`);
      } else {
        this.logger.warn(`User not found or no tg_id: ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send Telegram message to user ${userId}:`, error);
      // Не падаем, сообщение уже сохранено в БД
    }

    return savedMessage;
  }

  async createUserMessage(userId: string, text: string, mediaUrl?: string) {
    const message = this.messageRepo.create({
      user_id: userId,
      from_admin_tg_id: null,
      text,
      media_url: mediaUrl,
      is_read: false,
    });

    const savedMessage = await this.messageRepo.save(message);
    
    // 🔄 Publish sync event
    await this.syncService.publish('messages.created', { 
      id: savedMessage.id, 
      userId,
      fromAdmin: false 
    });

    return savedMessage;
  }

  async getUnreadCount() {
    return await this.messageRepo
      .createQueryBuilder('message')
      .where('message.from_admin_tg_id IS NULL')
      .andWhere('message.is_read = :isRead', { isRead: false })
      .getCount();
  }
}
