"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const task_entity_1 = require("../../entities/task.entity");
const user_task_entity_1 = require("../../entities/user-task.entity");
const user_entity_1 = require("../../entities/user.entity");
const balance_log_entity_1 = require("../../entities/balance-log.entity");
const sync_service_1 = require("../sync/sync.service");
const ranks_service_1 = require("../ranks/ranks.service");
let TasksService = class TasksService {
    constructor(taskRepo, userTaskRepo, userRepo, balanceLogRepo, syncService, ranksService) {
        this.taskRepo = taskRepo;
        this.userTaskRepo = userTaskRepo;
        this.userRepo = userRepo;
        this.balanceLogRepo = balanceLogRepo;
        this.syncService = syncService;
        this.ranksService = ranksService;
    }
    async create(createTaskDto) {
        const task = this.taskRepo.create(createTaskDto);
        const saved = await this.taskRepo.save(task);
        await this.syncService.emitEntityEvent('tasks', 'created', saved);
        return saved;
    }
    async findAll(active) {
        const where = active !== undefined ? { active } : {};
        const tasks = await this.taskRepo.find({
            where,
            order: { created_at: 'DESC' },
        });
        const tasksWithRanks = await Promise.all(tasks.map(async (task) => {
            const completedUserTasks = await this.userTaskRepo.find({
                where: { task_id: task.id, status: 'completed' },
                relations: ['user'],
            });
            const userIds = completedUserTasks.map((ut) => ut.user_id);
            const ranks = await this.ranksService.getRanksForUsers(userIds);
            const rankStats = {
                stone: 0,
                bronze: 0,
                silver: 0,
                gold: 0,
                platinum: 0,
            };
            ranks.forEach((rank) => {
                if (rank.platinum_active && rank.platinum_expires_at && new Date() < rank.platinum_expires_at) {
                    rankStats.platinum++;
                }
                else {
                    rankStats[rank.current_rank] = (rankStats[rank.current_rank] || 0) + 1;
                }
            });
            return {
                ...task,
                rank_stats: rankStats,
            };
        }));
        return tasksWithRanks;
    }
    async findOne(id) {
        const task = await this.taskRepo.findOne({ where: { id } });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        return task;
    }
    async update(id, updateTaskDto) {
        const task = await this.findOne(id);
        Object.assign(task, updateTaskDto);
        const updated = await this.taskRepo.save(task);
        await this.syncService.emitEntityEvent('tasks', 'updated', updated);
        return updated;
    }
    async remove(id) {
        const task = await this.findOne(id);
        await this.taskRepo.remove(task);
        await this.syncService.emitEntityEvent('tasks', 'deleted', { id });
        return { success: true, message: 'Task removed' };
    }
    async getTaskStats(id) {
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
    async getPendingReview(status, search) {
        const queryBuilder = this.userTaskRepo
            .createQueryBuilder('userTask')
            .leftJoinAndSelect('userTask.user', 'user')
            .leftJoinAndSelect('userTask.task', 'task')
            .orderBy('userTask.submitted_at', 'DESC');
        if (status) {
            queryBuilder.andWhere('userTask.status = :status', { status });
        }
        else {
            queryBuilder.andWhere('userTask.status IN (:...statuses)', {
                statuses: ['submitted', 'in_progress'],
            });
        }
        if (search) {
            queryBuilder.andWhere('(user.username ILIKE :search OR user.tg_id ILIKE :search OR user.first_name ILIKE :search OR user.last_name ILIKE :search)', { search: `%${search}%` });
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
    async approveTask(userTaskId) {
        const userTask = await this.userTaskRepo.findOne({
            where: { id: userTaskId },
            relations: ['user', 'task'],
        });
        if (!userTask) {
            throw new common_1.NotFoundException('User task not found');
        }
        if (userTask.status !== 'submitted') {
            throw new common_1.BadRequestException(`Task is not submitted for review (status: ${userTask.status})`);
        }
        const user = userTask.user;
        const task = userTask.task;
        const reward = userTask.reward || 0;
        userTask.status = 'completed';
        userTask.reward_received = reward;
        userTask.completed_at = new Date();
        await this.userTaskRepo.save(userTask);
        const balanceBefore = parseFloat(user.balance_usdt.toString());
        const balanceAfter = balanceBefore + reward;
        user.balance_usdt = balanceAfter;
        user.total_earned = parseFloat(user.total_earned.toString()) + reward;
        user.tasks_completed = user.tasks_completed + 1;
        await this.userRepo.save(user);
        await this.balanceLogRepo.save({
            user_id: user.id,
            delta: reward,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            reason: 'task_reward',
            comment: `Награда за выполнение задания: ${task.title} (одобрено администратором)`,
        });
        await this.syncService.emitEntityEvent('user_tasks', 'updated', userTask);
        await this.ranksService.incrementTasksCompleted(user.id);
        const rankUpdate = await this.ranksService.checkAndUpdateRank(user.id);
        return {
            success: true,
            message: 'Task approved and reward credited',
            userTask,
            balanceAfter,
            rankUpdate: rankUpdate.leveledUp ? {
                leveledUp: true,
                newLevel: rankUpdate.newLevel,
            } : undefined,
        };
    }
    async rejectTask(userTaskId, reason) {
        const userTask = await this.userTaskRepo.findOne({
            where: { id: userTaskId },
            relations: ['user', 'task'],
        });
        if (!userTask) {
            throw new common_1.NotFoundException('User task not found');
        }
        if (userTask.status !== 'submitted') {
            throw new common_1.BadRequestException(`Task is not submitted for review (status: ${userTask.status})`);
        }
        userTask.status = 'rejected';
        await this.userTaskRepo.save(userTask);
        await this.syncService.emitEntityEvent('user_tasks', 'updated', userTask);
        return {
            success: true,
            message: 'Task rejected',
            userTask,
            reason: reason || 'Не указано',
        };
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(task_entity_1.Task)),
    __param(1, (0, typeorm_1.InjectRepository)(user_task_entity_1.UserTask)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(3, (0, typeorm_1.InjectRepository)(balance_log_entity_1.BalanceLog)),
    __param(5, (0, common_1.Inject)((0, common_1.forwardRef)(() => ranks_service_1.RanksService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        sync_service_1.SyncService,
        ranks_service_1.RanksService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map