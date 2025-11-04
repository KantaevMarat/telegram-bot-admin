import { Repository } from 'typeorm';
import { Message } from '../../entities/message.entity';
import { User } from '../../entities/user.entity';
import { SyncService } from '../sync/sync.service';
import { BotService } from '../bot/bot.service';
export declare class MessagesService {
    private messageRepo;
    private userRepo;
    private syncService;
    private botService;
    private readonly logger;
    constructor(messageRepo: Repository<Message>, userRepo: Repository<User>, syncService: SyncService, botService: BotService);
    getChats(): Promise<any[]>;
    getMessages(userId: string, limit?: number): Promise<Message[]>;
    sendMessage(userId: string, text: string | undefined, adminTgId: string, mediaUrl?: string): Promise<Message>;
    createUserMessage(userId: string, text: string, mediaUrl?: string, mediaType?: string): Promise<Message>;
    getUnreadCount(): Promise<number>;
}
