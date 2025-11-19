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
exports.ButtonsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const button_entity_1 = require("../../entities/button.entity");
const sync_service_1 = require("../sync/sync.service");
let ButtonsService = class ButtonsService {
    constructor(buttonRepo, syncService) {
        this.buttonRepo = buttonRepo;
        this.syncService = syncService;
    }
    async create(createButtonDto) {
        const button = this.buttonRepo.create(createButtonDto);
        const saved = await this.buttonRepo.save(button);
        await this.syncService.emitEntityEvent('buttons', 'created', saved);
        return saved;
    }
    async findAll(active) {
        const where = active !== undefined ? { active } : {};
        return await this.buttonRepo.find({
            where,
            order: { row: 'ASC', col: 'ASC' },
        });
    }
    async findOne(id) {
        const button = await this.buttonRepo.findOne({ where: { id } });
        if (!button) {
            throw new common_1.NotFoundException('Button not found');
        }
        return button;
    }
    async update(id, updateButtonDto) {
        const button = await this.findOne(id);
        Object.assign(button, updateButtonDto);
        const updated = await this.buttonRepo.save(button);
        await this.syncService.emitEntityEvent('buttons', 'updated', updated);
        return updated;
    }
    async remove(id) {
        const button = await this.findOne(id);
        await this.buttonRepo.remove(button);
        await this.syncService.emitEntityEvent('buttons', 'deleted', { id });
        return { success: true, message: 'Button removed' };
    }
    async testButton(id, testData) {
        const button = await this.findOne(id);
        const result = {
            success: true,
            payload: {
                button_id: button.id,
                label: button.label,
                action_type: button.action_type,
                action_payload: button.action_payload,
                command: button.command,
            },
            response: {
                message: 'Кнопка выполнена успешно',
                timestamp: new Date().toISOString(),
            },
            logs: [
                `[${new Date().toISOString()}] Button ${button.id} executed`,
                `Action type: ${button.action_type}`,
                `Command: ${button.command || 'N/A'}`,
            ],
        };
        return result;
    }
    async testButtonConfig(config) {
        if (!config.label || config.label.length === 0) {
            return {
                success: false,
                error: 'Label is required',
            };
        }
        if (config.label.length > 64) {
            return {
                success: false,
                error: 'Label must not exceed 64 characters',
            };
        }
        const result = {
            success: true,
            payload: {
                config,
                test_user_id: 'test_user',
                test_chat_id: 'test_chat',
            },
            response: {
                message: 'Configuration test successful',
                timestamp: new Date().toISOString(),
            },
            logs: [
                `[${new Date().toISOString()}] Testing button configuration`,
                `Mode: ${config.mode || 'N/A'}`,
                `Label: ${config.label}`,
            ],
        };
        return result;
    }
    async exportButton(id) {
        const button = await this.findOne(id);
        const exportData = {
            id: button.id,
            label: button.label,
            action_type: button.action_type,
            action_payload: button.action_payload,
            media_url: button.media_url,
            command: button.command,
            row: button.row,
            col: button.col,
            active: button.active,
            created_at: button.created_at,
            updated_at: button.updated_at,
        };
        return exportData;
    }
};
exports.ButtonsService = ButtonsService;
exports.ButtonsService = ButtonsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(button_entity_1.Button)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        sync_service_1.SyncService])
], ButtonsService);
//# sourceMappingURL=buttons.service.js.map