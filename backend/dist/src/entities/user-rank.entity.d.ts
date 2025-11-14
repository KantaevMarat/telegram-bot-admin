import { User } from './user.entity';
export declare enum RankLevel {
    STONE = "stone",
    BRONZE = "bronze",
    SILVER = "silver",
    GOLD = "gold",
    PLATINUM = "platinum"
}
export declare class UserRank {
    id: string;
    user_id: string;
    user: User;
    current_rank: RankLevel;
    tasks_completed: number;
    referrals_count: number;
    channels_subscribed: boolean;
    bonus_percentage: number;
    platinum_expires_at: Date;
    platinum_active: boolean;
    last_notification_sent: Date;
    notified_80_percent: boolean;
    notified_gold_achieved: boolean;
    created_at: Date;
    updated_at: Date;
}
