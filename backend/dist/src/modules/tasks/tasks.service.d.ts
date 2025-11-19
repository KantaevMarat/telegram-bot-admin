import { Repository } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { UserTask } from '../../entities/user-task.entity';
import { User } from '../../entities/user.entity';
import { BalanceLog } from '../../entities/balance-log.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { SyncService } from '../sync/sync.service';
import { RanksService } from '../ranks/ranks.service';
export declare class TasksService {
    private taskRepo;
    private userTaskRepo;
    private userRepo;
    private balanceLogRepo;
    private syncService;
    private ranksService;
    constructor(taskRepo: Repository<Task>, userTaskRepo: Repository<UserTask>, userRepo: Repository<User>, balanceLogRepo: Repository<BalanceLog>, syncService: SyncService, ranksService: RanksService);
    create(createTaskDto: CreateTaskDto): Promise<Task>;
    findAll(active?: boolean): Promise<{
        rank_stats: {
            stone: number;
            bronze: number;
            silver: number;
            gold: number;
            platinum: number;
        };
        id: string;
        title: string;
        description: string;
        reward_min: number;
        reward_max: number;
        media_url: string;
        media_type: string;
        max_per_user: number;
        action_url: string;
        channel_id: string;
        task_type: string;
        command: string;
        min_completion_time: number;
        cooldown_hours: number;
        active: boolean;
        available_for: string;
        target_ranks: string;
        user_tasks: UserTask[];
        created_at: Date;
        updated_at: Date;
    }[]>;
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
        rankUpdate: {
            leveledUp: boolean;
            newLevel: import("../../entities/user-rank.entity").RankLevel | undefined;
        } | undefined;
    }>;
    rejectTask(userTaskId: string, reason?: string): Promise<{
        success: boolean;
        message: string;
        userTask: UserTask;
        reason: string;
    }>;
}
