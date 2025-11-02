import { Repository } from 'typeorm';
import { Channel } from '../../entities/channel.entity';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { SyncService } from '../sync/sync.service';
export declare class ChannelsService {
    private readonly channelRepo;
    private readonly syncService;
    private readonly logger;
    constructor(channelRepo: Repository<Channel>, syncService: SyncService);
    findAll(): Promise<Channel[]>;
    findActive(): Promise<Channel[]>;
    findOne(id: string): Promise<Channel>;
    create(dto: CreateChannelDto): Promise<Channel>;
    update(id: string, dto: UpdateChannelDto): Promise<Channel>;
    remove(id: string): Promise<void>;
    toggleActive(id: string): Promise<Channel>;
    reorder(ids: string[]): Promise<void>;
}
