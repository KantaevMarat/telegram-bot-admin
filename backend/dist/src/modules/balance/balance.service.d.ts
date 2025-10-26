import { Repository } from 'typeorm';
import { BalanceLog } from '../../entities/balance-log.entity';
import { User } from '../../entities/user.entity';
export declare class BalanceService {
    private balanceLogRepo;
    private userRepo;
    constructor(balanceLogRepo: Repository<BalanceLog>, userRepo: Repository<User>);
    getBalanceOverview(): Promise<{
        total_balance: number;
        total_earned: number;
        top_users: User[];
    }>;
    getBalanceLogs(page?: number, limit?: number): Promise<{
        data: BalanceLog[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
