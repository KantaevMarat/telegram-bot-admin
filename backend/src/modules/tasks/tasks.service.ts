import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { UserTask } from '../../entities/user-task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    @InjectRepository(UserTask)
    private userTaskRepo: Repository<UserTask>,
  ) {}

  async create(createTaskDto: CreateTaskDto) {
    const task = this.taskRepo.create(createTaskDto);
    return await this.taskRepo.save(task);
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
    return await this.taskRepo.save(task);
  }

  async remove(id: string) {
    const task = await this.findOne(id);
    await this.taskRepo.remove(task);
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
