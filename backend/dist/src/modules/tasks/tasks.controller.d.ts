import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
export declare class TasksController {
    private readonly tasksService;
    constructor(tasksService: TasksService);
    findAll(active?: string): Promise<import("../../entities/task.entity").Task[]>;
    findOne(id: string): Promise<import("../../entities/task.entity").Task>;
    getStats(id: string): Promise<{
        task: import("../../entities/task.entity").Task;
        completions: number;
        total_reward_paid: number;
    }>;
    create(createTaskDto: CreateTaskDto): Promise<import("../../entities/task.entity").Task>;
    update(id: string, updateTaskDto: UpdateTaskDto): Promise<import("../../entities/task.entity").Task>;
    remove(id: string): Promise<{
        success: boolean;
        message: string;
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
        userTask: import("../../entities/user-task.entity").UserTask;
        balanceAfter: number;
        rankUpdate: {
            leveledUp: boolean;
            newLevel: import("../../entities/user-rank.entity").RankLevel | undefined;
        } | undefined;
    }>;
    rejectTask(userTaskId: string, body?: {
        reason?: string;
    }): Promise<{
        success: boolean;
        message: string;
        userTask: import("../../entities/user-task.entity").UserTask;
        reason: string;
    }>;
}
