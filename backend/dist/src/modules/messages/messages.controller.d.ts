import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
export declare class MessagesController {
    private readonly messagesService;
    constructor(messagesService: MessagesService);
    getChats(): Promise<any[]>;
    getUnreadCount(): Promise<{
        unread: number;
    }>;
    getMessages(userId: string, limit?: number): Promise<import("../../entities/message.entity").Message[]>;
    sendMessage(userId: string, sendMessageDto: SendMessageDto, req: any): Promise<import("../../entities/message.entity").Message>;
}
