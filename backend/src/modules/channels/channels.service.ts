import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from '../../entities/channel.entity';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { SyncService } from '../sync/sync.service';

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepo: Repository<Channel>,
    private readonly syncService: SyncService,
  ) {}

  async findAll(): Promise<Channel[]> {
    return this.channelRepo.find({
      order: { order: 'ASC', created_at: 'ASC' },
    });
  }

  async findActive(): Promise<Channel[]> {
    return this.channelRepo.find({
      where: { is_active: true },
      order: { order: 'ASC', created_at: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Channel> {
    const channel = await this.channelRepo.findOne({ where: { id } });
    if (!channel) {
      throw new NotFoundException(`Channel with ID ${id} not found`);
    }
    return channel;
  }

  async create(dto: CreateChannelDto): Promise<Channel> {
    // Нормализуем channel_id
    let channelId = dto.channel_id.trim();
    
    // Если это username, убираем @ если есть
    if (channelId.startsWith('@')) {
      channelId = channelId.substring(1);
    }
    
    // Извлекаем username если это ссылка
    let username = dto.username;
    if (!username && channelId.includes('t.me/')) {
      const match = channelId.match(/t\.me\/([^/?]+)/);
      if (match) {
        username = match[1];
        channelId = username;
      }
    }

    const channel = this.channelRepo.create({
      ...dto,
      channel_id: channelId,
      username: username || channelId,
      is_active: dto.is_active ?? true,
    });

    const saved = await this.channelRepo.save(channel);
    
    await this.syncService.publish('channels.created', { id: saved.id });
    
    this.logger.log(`Channel created: ${saved.title} (${saved.channel_id})`);
    return saved;
  }

  async update(id: string, dto: UpdateChannelDto): Promise<Channel> {
    const channel = await this.findOne(id);
    
    Object.assign(channel, dto);
    
    const updated = await this.channelRepo.save(channel);
    
    await this.syncService.publish('channels.updated', { id: updated.id });
    
    this.logger.log(`Channel updated: ${updated.title}`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const channel = await this.findOne(id);
    await this.channelRepo.remove(channel);
    
    await this.syncService.publish('channels.deleted', { id });
    
    this.logger.log(`Channel removed: ${channel.title}`);
  }

  async toggleActive(id: string): Promise<Channel> {
    const channel = await this.findOne(id);
    channel.is_active = !channel.is_active;
    
    const updated = await this.channelRepo.save(channel);
    
    await this.syncService.publish('channels.updated', { id: updated.id });
    
    return updated;
  }

  async reorder(ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i++) {
      await this.channelRepo.update(ids[i], { order: i });
    }
    
    await this.syncService.publish('channels.reordered', {});
  }
}

