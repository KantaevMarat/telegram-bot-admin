import { Repository } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { UserTask } from '../../entities/user-task.entity';
import { User } from '../../entities/user.entity';
import { BalanceLog } from '../../entities/balance-log.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { SyncService } from '../sync/sync.service';
export declare class TasksService {
    private taskRepo;
    private userTaskRepo;
    private userRepo;
    private balanceLogRepo;
    private syncService;
    constructor(taskRepo: Repository<Task>, userTaskRepo: Repository<UserTask>, userRepo: Repository<User>, balanceLogRepo: Repository<BalanceLog>, syncService: SyncService);
    create(createTaskDto: CreateTaskDto): Promise<Task>;
    findAll(active?: boolean): Promise<Task[]>;
    findOne(id: string): Promise<Task>;
    update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task>;
    remove(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getTaskStats(id: string): Promise<{
        task: Task;
        completions: number;
        total_reward_paid: number;
    }>;
    getPendingReview(status?: string, search?: string): Promise<{
        id: string;
        user_id: string;
        task_id: string;
        status: string;
        reward: number;
        started_at: Date;
        submitted_at: Date;
        completed_at: Date;
        user: {
            id: string;
            tg_id: string;
            username: string;
            first_name: string;
            last_name: string;
        };
        task: {
            id: string;
            title: string;
            description: string;
            reward_min: number;
            reward_max: number;
        };
    }[]>;
    approveTask(userTaskId: string): Promise<{
        success: boolean;
        message: string;
        userTask: UserTask;
        balanceAfter: number;
    }>;
    rejectTask(userTaskId: string, reason?: string): Promise<{
        success: boolean;
        message: string;
        userTask: UserTask;
        reason: string;
    }>;
}
