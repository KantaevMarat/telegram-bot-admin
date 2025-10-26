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
    created_at: Date;
}
