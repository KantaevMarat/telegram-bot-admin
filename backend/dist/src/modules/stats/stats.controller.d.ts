import { StatsService } from './stats.service';
import { FakeStatsService } from './fake-stats.service';
export declare class StatsController {
    private readonly statsService;
    private readonly fakeStatsService;
    constructor(statsService: StatsService, fakeStatsService: FakeStatsService);
    getStats(): Promise<{
        real: {
            users_count: number;
            total_balance: number;
            total_earned: number;
            active_users_24h: number;
            total_payouts: number;
            pending_payouts: number;
        };
        fake: {
            online: number;
            active: number;
            paid_usdt: number;
            calculated_at: Date;
        };
    }>;
    getRealStats(): Promise<{
        users_count: number;
        total_balance: number;
        total_earned: number;
        active_users_24h: number;
        total_payouts: number;
        pending_payouts: number;
    }>;
    getFakeStats(): Promise<import("../../entities/fake-stats.entity").FakeStats>;
    getStatsHistory(days?: number): Promise<{
        real: import("../../entities/real-stats-snapshot.entity").RealStatsSnapshot[];
        fake: import("../../entities/fake-stats.entity").FakeStats[];
    }>;
    regenerateFakeStats(): Promise<{
        success: boolean;
        message: string;
        data: import("../../entities/fake-stats.entity").FakeStats;
    }>;
    getTopUsers(limit?: number): Promise<{
        top_by_balance: import("../../entities/user.entity").User[];
        top_by_earned: import("../../entities/user.entity").User[];
        top_by_tasks: import("../../entities/user.entity").User[];
    }>;
}
