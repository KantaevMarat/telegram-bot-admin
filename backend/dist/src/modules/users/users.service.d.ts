import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { BalanceLog } from '../../entities/balance-log.entity';
import { Payout } from '../../entities/payout.entity';
import { BotService } from '../bot/bot.service';
import { FakeStatsService } from '../stats/fake-stats.service';
export declare class UsersService {
    private userRepo;
    private balanceLogRepo;
    private payoutRepo;
    private botService;
    private fakeStatsService;
    private readonly logger;
    constructor(userRepo: Repository<User>, balanceLogRepo: Repository<BalanceLog>, payoutRepo: Repository<Payout>, botService: BotService, fakeStatsService: FakeStatsService);
    findAll(page?: number, limit?: number, search?: string, status?: string): Promise<{
        data: User[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: string): Promise<User>;
    findByTgId(tg_id: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    updateBalance(tgId: string, delta: number, reason: string, adminTgId?: string, comment?: string): Promise<User>;
    blockUser(id: string): Promise<User>;
    unblockUser(id: string): Promise<User>;
    getBalanceLogs(userId: string, limit?: number): Promise<BalanceLog[]>;
    createPayoutRequest(user: User, amount: number, walletAddress: string): Promise<Payout>;
}
