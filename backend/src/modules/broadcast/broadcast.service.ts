import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User } from '../../entities/user.entity';
import { Broadcast } from '../../entities/broadcast.entity';
import { BroadcastDto } from './dto/broadcast.dto';

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Broadcast)
    private broadcastRepo: Repository<Broadcast>,
    @InjectQueue('broadcast') private broadcastQueue: Queue,
  ) {}

  // Создание рассылки (немедленной или запланированной)
  async createBroadcast(broadcastDto: BroadcastDto): Promise<Broadcast> {
    const broadcast = this.broadcastRepo.create({
      text: broadcastDto.text,
      media_urls: broadcastDto.media_urls || null,
      scheduled_at: broadcastDto.scheduled_at ? new Date(broadcastDto.scheduled_at) : null,
      status: broadcastDto.scheduled_at ? 'scheduled' : 'draft',
      batch_size: broadcastDto.batchSize || 30,
      throttle_ms: broadcastDto.throttle || 1000,
      created_by_admin_tg_id: null,
    });

    const saved = await this.broadcastRepo.save(broadcast) as Broadcast;

    // Если не запланирована - отправляем сразу
    if (!broadcastDto.scheduled_at) {
      await this.executeBroadcast(saved.id);
    }

    return saved;
  }

  // Получить все рассылки
  async getAllBroadcasts() {
    return this.broadcastRepo.find({
      order: { created_at: 'DESC' },
    });
  }

  // Получить рассылку по ID
  async getBroadcastById(id: string) {
    return this.broadcastRepo.findOne({ where: { id } });
  }

  // Удалить рассылку
  async deleteBroadcast(id: string) {
    const broadcast = await this.getBroadcastById(id);
    if (broadcast && broadcast.status === 'scheduled') {
      await this.broadcastRepo.delete(id);
      return { success: true };
    }
    throw new Error('Can only delete scheduled broadcasts');
  }

  // Выполнить рассылку (немедленно или по расписанию)
  async executeBroadcast(broadcastId: string) {
    const broadcast = await this.getBroadcastById(broadcastId);
    
    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    if (broadcast.status === 'sending' || broadcast.status === 'completed') {
      throw new Error('Broadcast already sent or in progress');
    }

    // Получаем активных пользователей
    const users = await this.userRepo.find({
      where: { status: 'active' },
      select: ['id', 'tg_id'],
    });

    // Обновляем статус
    await this.broadcastRepo.update(broadcastId, {
      status: 'sending',
      started_at: new Date(),
      total_users: users.length,
    });

    this.logger.log(`Starting broadcast ${broadcastId} for ${users.length} users`);

    // Добавляем задачи в очередь
    const batchSize = broadcast.batch_size;
    const throttle = broadcast.throttle_ms;

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await this.broadcastQueue.add(
        'send-batch',
        {
          broadcastId,
          users: batch,
          text: broadcast.text,
          media_urls: broadcast.media_urls,
        },
        {
          delay: Math.floor(i / batchSize) * throttle,
        },
      );
    }

    return {
      success: true,
      message: `Broadcast started for ${users.length} users`,
      total_users: users.length,
      batches: Math.ceil(users.length / batchSize),
    };
  }

  // Обновить счетчики после отправки батча
  async updateBroadcastProgress(broadcastId: string, sent: number, failed: number) {
    const broadcast = await this.getBroadcastById(broadcastId);
    
    if (!broadcast) {
      return;
    }

    const newSentCount = broadcast.sent_count + sent;
    const newFailedCount = broadcast.failed_count + failed;
    const total = newSentCount + newFailedCount;

    // Если все отправлено - завершаем
    if (total >= broadcast.total_users) {
      await this.broadcastRepo.update(broadcastId, {
        sent_count: newSentCount,
        failed_count: newFailedCount,
        status: 'completed',
        completed_at: new Date(),
      });
      this.logger.log(`Broadcast ${broadcastId} completed: ${newSentCount}/${broadcast.total_users} sent`);
    } else {
      await this.broadcastRepo.update(broadcastId, {
        sent_count: newSentCount,
        failed_count: newFailedCount,
      });
    }
  }

  // Cron: проверка запланированных рассылок каждую минуту
  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledBroadcasts() {
    const now = new Date();
    
    const scheduled = await this.broadcastRepo.find({
      where: {
        status: 'scheduled',
        scheduled_at: LessThanOrEqual(now),
      },
    });

    for (const broadcast of scheduled) {
      this.logger.log(`Executing scheduled broadcast ${broadcast.id}`);
      try {
        await this.executeBroadcast(broadcast.id);
      } catch (error) {
        this.logger.error(`Failed to execute broadcast ${broadcast.id}:`, error);
        await this.broadcastRepo.update(broadcast.id, {
          status: 'failed',
        });
      }
    }
  }

  // Старый метод для обратной совместимости
  async sendBroadcast(broadcastDto: BroadcastDto) {
    return this.createBroadcast(broadcastDto);
  }
}
