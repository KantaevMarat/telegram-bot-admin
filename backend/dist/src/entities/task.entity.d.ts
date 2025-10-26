import { UserTask } from './user-task.entity';
export declare class Task {
    id: string;
    title: string;
    description: string;
    reward_min: number;
    reward_max: number;
    media_url: string;
    media_type: string;
    max_per_user: number;
    action_url: string;
    cooldown_hours: number;
    active: boolean;
    user_tasks: UserTask[];
    created_at: Date;
    updated_at: Date;
}
