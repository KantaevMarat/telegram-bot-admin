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
exports.ScenariosService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const scenario_entity_1 = require("../../entities/scenario.entity");
let ScenariosService = class ScenariosService {
    constructor(scenarioRepo) {
        this.scenarioRepo = scenarioRepo;
    }
    async create(createScenarioDto) {
        const scenario = this.scenarioRepo.create(createScenarioDto);
        return await this.scenarioRepo.save(scenario);
    }
    async findAll(active) {
        const where = active !== undefined ? { active } : {};
        return await this.scenarioRepo.find({
            where,
            order: { created_at: 'DESC' },
        });
    }
    async findOne(id) {
        const scenario = await this.scenarioRepo.findOne({ where: { id } });
        if (!scenario) {
            throw new common_1.NotFoundException('Scenario not found');
        }
        return scenario;
    }
    async findByTrigger(trigger) {
        return await this.scenarioRepo.findOne({
            where: { trigger, active: true },
        });
    }
    async update(id, updateScenarioDto) {
        const scenario = await this.findOne(id);
        Object.assign(scenario, updateScenarioDto);
        return await this.scenarioRepo.save(scenario);
    }
    async remove(id) {
        const scenario = await this.findOne(id);
        await this.scenarioRepo.remove(scenario);
        return { success: true, message: 'Scenario removed' };
    }
};
exports.ScenariosService = ScenariosService;
exports.ScenariosService = ScenariosService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(scenario_entity_1.Scenario)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ScenariosService);
//# sourceMappingURL=scenarios.service.js.map