import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { User } from '../../entities/user.entity';
import { BroadcastDto } from './dto/broadcast.dto';

@Injectable()
export class BroadcastService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectQueue('broadcast') private broadcastQueue: Queue,
  ) {}

  async sendBroadcast(broadcastDto: BroadcastDto) {
    // Get active users
    const users = await this.userRepo.find({
      where: { status: 'active' },
      select: ['id', 'tg_id'],
    });

    const batchSize = broadcastDto.batchSize || 30;
    const throttle = broadcastDto.throttle || 1000;

    // Add jobs to queue in batches
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await this.broadcastQueue.add(
        'send-batch',
        {
          users: batch,
          text: broadcastDto.text,
          media_urls: broadcastDto.media_urls,
        },
        {
          delay: Math.floor(i / batchSize) * throttle,
        },
      );
    }

    return {
      success: true,
      message: `Broadcast scheduled for ${users.length} users`,
      total_users: users.length,
      batches: Math.ceil(users.length / batchSize),
    };
  }
}
