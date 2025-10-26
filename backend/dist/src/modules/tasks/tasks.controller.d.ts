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
}
