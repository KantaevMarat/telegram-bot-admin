import { Message } from './message.entity';
import { Payout } from './payout.entity';
import { BalanceLog } from './balance-log.entity';
import { UserTask } from './user-task.entity';
export declare class User {
    id: string;
    tg_id: string;
    username: string;
    first_name: string;
    last_name: string;
    balance_usdt: number;
    tasks_completed: number;
    total_earned: number;
    status: string;
    referral_code: string;
    referred_by: string;
    registered_at: Date;
    updated_at: Date;
    messages: Message[];
    payouts: Payout[];
    balance_logs: BalanceLog[];
    user_tasks: UserTask[];
}
