import { User } from './user.entity';
export declare class Message {
    id: string;
    user_id: string;
    user: User;
    from_admin_tg_id: string | null;
    text: string;
    media_url: string;
    media_type: string;
    is_read: boolean;
    status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    created_at: Date;
    delivered_at: Date | null;
    read_at: Date | null;
}
