import { RanksService } from './ranks.service';
export declare class RanksController {
    private readonly ranksService;
    constructor(ranksService: RanksService);
    getSettings(): Promise<import("../../entities/rank-settings.entity").RankSettings>;
    updateSettings(data: any): Promise<import("../../entities/rank-settings.entity").RankSettings>;
    getStatistics(): Promise<{
        byRank: any[];
        platinumActive: number;
        total: number;
    }>;
    getUserRank(userId: string): Promise<{
        rank: import("../../entities/user-rank.entity").UserRank;
        progress: {
            currentRank: import("../../entities/user-rank.entity").RankLevel;
            nextRank: import("../../entities/user-rank.entity").RankLevel | null;
            progress: number;
            tasksProgress: {
                current: number;
                required: number;
            };
            referralsProgress: {
                current: number;
                required: number;
            };
        };
    }>;
    checkUserRank(userId: string): Promise<{
        rank: import("../../entities/user-rank.entity").UserRank;
        leveledUp: boolean;
        newLevel?: import("../../entities/user-rank.entity").RankLevel;
    }>;
}
