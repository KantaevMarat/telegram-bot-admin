export declare class CreateTaskDto {
    title: string;
    description: string;
    reward_min: number;
    reward_max: number;
    media_url?: string;
    media_type?: string;
    max_per_user?: number;
    action_url?: string;
    channel_id?: string;
    task_type?: string;
    cooldown_hours?: number;
    active?: boolean;
}
