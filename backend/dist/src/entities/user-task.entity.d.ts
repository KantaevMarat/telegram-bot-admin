import { User } from './user.entity';
import { Task } from './task.entity';
export declare class UserTask {
    id: string;
    user_id: string;
    user: User;
    task_id: string;
    task: Task;
    reward: number;
    reward_received: number;
    status: string;
    created_at: Date;
    started_at: Date;
    submitted_at: Date;
    completed_at: Date;
}
