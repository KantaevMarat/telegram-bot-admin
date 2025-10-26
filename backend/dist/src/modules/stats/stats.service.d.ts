import { Repository } from 'typeorm';
import { FakeStatsService } from './fake-stats.service';
import { RealStatsSnapshot } from '../../entities/real-stats-snapshot.entity';
import { User } from '../../entities/user.entity';
import { Payout } from '../../entities/payout.entity';
export declare class StatsService {
    private realStatsRepo;
    private userRepo;
    private payoutRepo;
    private fakeStatsService;
    constructor(realStatsRepo: Repository<RealStatsSnapshot>, userRepo: Repository<User>, payoutRepo: Repository<Payout>, fakeStatsService: FakeStatsService);
    getCombinedStats(): Promise<{
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
    getStatsHistory(days?: number): Promise<{
        real: RealStatsSnapshot[];
        fake: import("../../entities/fake-stats.entity").FakeStats[];
    }>;
    getTopUsers(limit?: number): Promise<{
        top_by_balance: User[];
        top_by_earned: User[];
        top_by_tasks: User[];
    }>;
}
