import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { UserTask } from '../../entities/user-task.entity';
import { User } from '../../entities/user.entity';
import { BalanceLog } from '../../entities/balance-log.entity';
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
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(BalanceLog)
    private balanceLogRepo: Repository<BalanceLog>,
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

  // 📋 MODERATION API

  async getPendingReview(status?: string, search?: string) {
    const queryBuilder = this.userTaskRepo
      .createQueryBuilder('userTask')
      .leftJoinAndSelect('userTask.user', 'user')
      .leftJoinAndSelect('userTask.task', 'task')
      .orderBy('userTask.submitted_at', 'DESC');

    // Filter by status
    if (status) {
      queryBuilder.andWhere('userTask.status = :status', { status });
    } else {
      // Default: show submitted and in_progress
      queryBuilder.andWhere('userTask.status IN (:...statuses)', {
        statuses: ['submitted', 'in_progress'],
      });
    }

    // Search by username or tg_id
    if (search) {
      queryBuilder.andWhere(
        '(user.username ILIKE :search OR user.tg_id ILIKE :search OR user.first_name ILIKE :search OR user.last_name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const userTasks = await queryBuilder.getMany();

    return userTasks.map((ut) => ({
      id: ut.id,
      user_id: ut.user_id,
      task_id: ut.task_id,
      status: ut.status,
      reward: ut.reward,
      started_at: ut.started_at,
      submitted_at: ut.submitted_at,
      completed_at: ut.completed_at,
      user: {
        id: ut.user.id,
        tg_id: ut.user.tg_id,
        username: ut.user.username,
        first_name: ut.user.first_name,
        last_name: ut.user.last_name,
      },
      task: {
        id: ut.task.id,
        title: ut.task.title,
        description: ut.task.description,
        reward_min: ut.task.reward_min,
        reward_max: ut.task.reward_max,
      },
    }));
  }

  async approveTask(userTaskId: string) {
    const userTask = await this.userTaskRepo.findOne({
      where: { id: userTaskId },
      relations: ['user', 'task'],
    });

    if (!userTask) {
      throw new NotFoundException('User task not found');
    }

    if (userTask.status !== 'submitted') {
      throw new BadRequestException(`Task is not submitted for review (status: ${userTask.status})`);
    }

    const user = userTask.user;
    const task = userTask.task;
    const reward = userTask.reward || 0;

    // Update user task
    userTask.status = 'completed';
    userTask.reward_received = reward;
    userTask.completed_at = new Date();
    await this.userTaskRepo.save(userTask);

    // Update user balance and stats
    const balanceBefore = parseFloat(user.balance_usdt.toString());
    const balanceAfter = balanceBefore + reward;

    user.balance_usdt = balanceAfter;
    user.total_earned = parseFloat(user.total_earned.toString()) + reward;
    user.tasks_completed = user.tasks_completed + 1;
    await this.userRepo.save(user);

    // Log balance change
    await this.balanceLogRepo.save({
      user_id: user.id,
      delta: reward,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reason: 'task_reward',
      comment: `Награда за выполнение задания: ${task.title} (одобрено администратором)`,
    });

    // Emit sync event
    await this.syncService.emitEntityEvent('user_tasks', 'updated', userTask);

    return {
      success: true,
      message: 'Task approved and reward credited',
      userTask,
      balanceAfter,
    };
  }

  async rejectTask(userTaskId: string, reason?: string) {
    const userTask = await this.userTaskRepo.findOne({
      where: { id: userTaskId },
      relations: ['user', 'task'],
    });

    if (!userTask) {
      throw new NotFoundException('User task not found');
    }

    if (userTask.status !== 'submitted') {
      throw new BadRequestException(`Task is not submitted for review (status: ${userTask.status})`);
    }

    // Update user task
    userTask.status = 'rejected';
    await this.userTaskRepo.save(userTask);

    // Emit sync event
    await this.syncService.emitEntityEvent('user_tasks', 'updated', userTask);

    return {
      success: true,
      message: 'Task rejected',
      userTask,
      reason: reason || 'Не указано',
    };
  }
}
