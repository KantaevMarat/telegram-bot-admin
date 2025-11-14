import { Repository } from 'typeorm';
import { UserRank, RankLevel } from '../../entities/user-rank.entity';
import { RankSettings } from '../../entities/rank-settings.entity';
import { User } from '../../entities/user.entity';
export declare class RanksService {
    private rankRepo;
    private settingsRepo;
    private userRepo;
    private readonly logger;
    constructor(rankRepo: Repository<UserRank>, settingsRepo: Repository<RankSettings>, userRepo: Repository<User>);
    getUserRank(userId: string): Promise<UserRank>;
    checkAndUpdateRank(userId: string): Promise<{
        rank: UserRank;
        leveledUp: boolean;
        newLevel?: RankLevel;
    }>;
    applyRankBonus(baseReward: number, bonusPercentage: number): number;
    incrementTasksCompleted(userId: string): Promise<void>;
    incrementReferralsCount(userId: string): Promise<void>;
    setChannelsSubscribed(userId: string, subscribed: boolean): Promise<void>;
    activatePlatinum(userId: string, durationDays: number): Promise<UserRank>;
    getSettings(): Promise<RankSettings>;
    updateSettings(data: Partial<RankSettings>): Promise<RankSettings>;
    getRankProgress(userId: string): Promise<{
        currentRank: RankLevel;
        nextRank: RankLevel | null;
        progress: number;
        tasksProgress: {
            current: number;
            required: number;
        };
        referralsProgress: {
            current: number;
            required: number;
        };
    }>;
    checkExpiringSubscriptions(): Promise<void>;
    getRankStatistics(): Promise<{
        byRank: any[];
        platinumActive: number;
        total: number;
    }>;
}
