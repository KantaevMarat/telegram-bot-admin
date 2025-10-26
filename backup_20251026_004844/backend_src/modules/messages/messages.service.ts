import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../../entities/message.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
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

    // Mark messages as read
    await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ is_read: true })
      .where('user_id = :userId AND from_admin_tg_id IS NULL AND is_read = false', { userId })
      .execute() as any;

    return messages;
  }

  async sendMessage(userId: string, text: string, adminTgId: string, mediaUrl?: string) {
    const message = this.messageRepo.create({
      user_id: userId,
      from_admin_tg_id: adminTgId,
      text,
      media_url: mediaUrl,
      is_read: true, // Admin messages are auto-read
    });

    return await this.messageRepo.save(message);
  }

  async createUserMessage(userId: string, text: string, mediaUrl?: string) {
    const message = this.messageRepo.create({
      user_id: userId,
      from_admin_tg_id: null,
      text,
      media_url: mediaUrl,
      is_read: false,
    });

    return await this.messageRepo.save(message);
  }

  async getUnreadCount() {
    return await this.messageRepo
      .createQueryBuilder('message')
      .where('message.from_admin_tg_id IS NULL')
      .andWhere('message.is_read = :isRead', { isRead: false })
      .getCount();
  }
}

