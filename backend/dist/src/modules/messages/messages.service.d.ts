import { Repository } from 'typeorm';
import { Message } from '../../entities/message.entity';
import { User } from '../../entities/user.entity';
export declare class MessagesService {
    private messageRepo;
    private userRepo;
    constructor(messageRepo: Repository<Message>, userRepo: Repository<User>);
    getChats(): Promise<any[]>;
    getMessages(userId: string, limit?: number): Promise<Message[]>;
    sendMessage(userId: string, text: string, adminTgId: string, mediaUrl?: string): Promise<Message>;
    createUserMessage(userId: string, text: string, mediaUrl?: string): Promise<Message>;
    getUnreadCount(): Promise<number>;
}
