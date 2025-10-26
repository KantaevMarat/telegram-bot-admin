import { BalanceService } from './balance.service';
export declare class BalanceController {
    private readonly balanceService;
    constructor(balanceService: BalanceService);
    getOverview(): Promise<{
        total_balance: number;
        total_earned: number;
        top_users: import("../../entities/user.entity").User[];
    }>;
    getLogs(page?: number, limit?: number): Promise<{
        data: import("../../entities/balance-log.entity").BalanceLog[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
