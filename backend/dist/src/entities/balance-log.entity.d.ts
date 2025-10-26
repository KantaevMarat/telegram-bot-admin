import { User } from './user.entity';
export declare class BalanceLog {
    id: string;
    user_id: string;
    user: User;
    admin_tg_id: string;
    delta: number;
    balance_before: number;
    balance_after: number;
    reason: string;
    comment: string;
    created_at: Date;
}
