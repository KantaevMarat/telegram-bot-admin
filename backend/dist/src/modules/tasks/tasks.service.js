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
let TasksService = class TasksService {
    constructor(taskRepo, userTaskRepo) {
        this.taskRepo = taskRepo;
        this.userTaskRepo = userTaskRepo;
    }
    async create(createTaskDto) {
        const task = this.taskRepo.create(createTaskDto);
        return await this.taskRepo.save(task);
    }
    async findAll(active) {
        const where = active !== undefined ? { active } : {};
        return await this.taskRepo.find({
            where,
            order: { created_at: 'DESC' },
        });
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
        return await this.taskRepo.save(task);
    }
    async remove(id) {
        const task = await this.findOne(id);
        await this.taskRepo.remove(task);
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
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(task_entity_1.Task)),
    __param(1, (0, typeorm_1.InjectRepository)(user_task_entity_1.UserTask)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], TasksService);
//# sourceMappingURL=tasks.service.js.map