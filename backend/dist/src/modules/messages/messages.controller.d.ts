import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
export declare class MessagesController {
    private readonly messagesService;
    constructor(messagesService: MessagesService);
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
    getUnreadCount(): Promise<{
        unread: number;
    }>;
    getMessages(userId: string, limit?: number): Promise<import("../../entities/message.entity").Message[]>;
    sendMessage(userId: string, sendMessageDto: SendMessageDto, req: any): Promise<import("../../entities/message.entity").Message>;
}
