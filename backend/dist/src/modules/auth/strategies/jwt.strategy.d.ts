import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private configService;
    private authService;
    constructor(configService: ConfigService, authService: AuthService);
    validate(payload: any): Promise<{
        type: string;
        id: string;
        tg_id: string;
        role: string;
        username: string;
        first_name: string;
        created_at: Date;
    } | {
        type: string;
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
        messages: import("../../../entities/message.entity").Message[];
        payouts: import("../../../entities/payout.entity").Payout[];
        balance_logs: import("../../../entities/balance-log.entity").BalanceLog[];
        user_tasks: import("../../../entities/user-task.entity").UserTask[];
    }>;
}
export {};
