import { Repository } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { UserTask } from '../../entities/user-task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { SyncService } from '../sync/sync.service';
export declare class TasksService {
    private taskRepo;
    private userTaskRepo;
    private syncService;
    constructor(taskRepo: Repository<Task>, userTaskRepo: Repository<UserTask>, syncService: SyncService);
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
}
