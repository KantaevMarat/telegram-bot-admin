import { Repository } from 'typeorm';
import { Message } from '../../entities/message.entity';
import { User } from '../../entities/user.entity';
import { SyncService } from '../sync/sync.service';
export declare class MessagesService {
    private messageRepo;
    private userRepo;
    private syncService;
    constructor(messageRepo: Repository<Message>, userRepo: Repository<User>, syncService: SyncService);
    getChats(): Promise<any[]>;
    getMessages(userId: string, limit?: number): Promise<Message[]>;
    sendMessage(userId: string, text: string, adminTgId: string, mediaUrl?: string): Promise<Message>;
    createUserMessage(userId: string, text: string, mediaUrl?: string): Promise<Message>;
    getUnreadCount(): Promise<number>;
}
