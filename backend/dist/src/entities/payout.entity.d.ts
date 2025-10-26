import { User } from './user.entity';
export declare class Payout {
    id: string;
    user_id: string;
    user: User;
    amount: number;
    method: string;
    method_details: string;
    status: string;
    reason_if_declined: string;
    processed_by_admin_tg_id: string;
    created_at: Date;
    updated_at: Date;
}
