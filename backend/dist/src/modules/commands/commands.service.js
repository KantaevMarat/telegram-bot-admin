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
exports.CommandsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const command_entity_1 = require("../../entities/command.entity");
let CommandsService = class CommandsService {
    constructor(commandRepo) {
        this.commandRepo = commandRepo;
    }
    async create(createCommandDto) {
        const existing = await this.commandRepo.findOne({
            where: { name: createCommandDto.name },
        });
        if (existing) {
            throw new common_1.ConflictException('Command with this name already exists');
        }
        const command = this.commandRepo.create(createCommandDto);
        return this.commandRepo.save(command);
    }
    async findAll() {
        return this.commandRepo.find({
            order: { created_at: 'DESC' },
        });
    }
    async findOne(id) {
        const command = await this.commandRepo.findOne({ where: { id } });
        if (!command) {
            throw new common_1.NotFoundException('Command not found');
        }
        return command;
    }
    async findByName(name) {
        return this.commandRepo.findOne({ where: { name, active: true } });
    }
    async update(id, updateCommandDto) {
        const command = await this.findOne(id);
        if (updateCommandDto.name && updateCommandDto.name !== command.name) {
            const existing = await this.commandRepo.findOne({
                where: { name: updateCommandDto.name },
            });
            if (existing) {
                throw new common_1.ConflictException('Command with this name already exists');
            }
        }
        Object.assign(command, updateCommandDto);
        return this.commandRepo.save(command);
    }
    async remove(id) {
        const command = await this.findOne(id);
        await this.commandRepo.remove(command);
    }
};
exports.CommandsService = CommandsService;
exports.CommandsService = CommandsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(command_entity_1.Command)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CommandsService);
//# sourceMappingURL=commands.service.js.map