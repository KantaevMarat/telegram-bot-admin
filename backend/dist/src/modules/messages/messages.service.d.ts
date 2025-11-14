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
    getChats(): Promise<{
        user_id: any;
        user: {
            id: any;
            tg_id: any;
            username: any;
            first_name: any;
            last_name: any;
        };
        last_message: {
            text: string;
            created_at: Date;
            from_admin: boolean;
        } | null;
        unread_count: number;
        media_count: number;
    }[]>;
    getMessages(userId: string, limit?: number): Promise<Message[]>;
    sendMessage(userId: string, text: string | undefined, adminTgId: string, mediaUrl?: string): Promise<Message>;
    createUserMessage(userId: string, text: string, mediaUrl?: string, mediaType?: string): Promise<Message>;
    getUnreadCount(): Promise<number>;
}
