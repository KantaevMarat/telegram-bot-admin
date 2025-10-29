import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { UserTask } from '../../entities/user-task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { SyncService } from '../sync/sync.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    @InjectRepository(UserTask)
    private userTaskRepo: Repository<UserTask>,
    private syncService: SyncService,
  ) {}

  async create(createTaskDto: CreateTaskDto) {
    const task = this.taskRepo.create(createTaskDto);
    const saved = await this.taskRepo.save(task);
    
    // Emit sync event
    await this.syncService.emitEntityEvent('tasks', 'created', saved);
    
    return saved;
  }

  async findAll(active?: boolean) {
    const where = active !== undefined ? { active } : {};
    return await this.taskRepo.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string) {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    const task = await this.findOne(id);
    Object.assign(task, updateTaskDto);
    const updated = await this.taskRepo.save(task);
    
    // Emit sync event
    await this.syncService.emitEntityEvent('tasks', 'updated', updated);
    
    return updated;
  }

  async remove(id: string) {
    const task = await this.findOne(id);
    await this.taskRepo.remove(task);
    
    // Emit sync event
    await this.syncService.emitEntityEvent('tasks', 'deleted', { id });
    
    return { success: true, message: 'Task removed' };
  }

  async getTaskStats(id: string) {
    const task = await this.findOne(id);

    const completionsCount = await this.userTaskRepo.count({
      where: { task_id: id },
    });

    const totalReward = await this.userTaskRepo
      .createQueryBuilder('userTask')
      .where('userTask.task_id = :id', { id })
      .select('COALESCE(SUM(userTask.reward_received), 0)', 'total')
      .getRawOne();

    return {
      task,
      completions: completionsCount,
      total_reward_paid: parseFloat(totalReward?.total || '0'),
    };
  }
}
