import { User } from './user.entity';
import { Task } from './task.entity';
export declare class UserTask {
    id: string;
    user_id: string;
    user: User;
    task_id: string;
    task: Task;
    reward_received: number;
    status: string;
    completed_at: Date;
}
