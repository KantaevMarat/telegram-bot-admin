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
exports.ButtonsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const buttons_service_1 = require("./buttons.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const admin_guard_1 = require("../auth/guards/admin.guard");
const create_button_dto_1 = require("./dto/create-button.dto");
const update_button_dto_1 = require("./dto/update-button.dto");
let ButtonsController = class ButtonsController {
    constructor(buttonsService) {
        this.buttonsService = buttonsService;
    }
    async findAll(active) {
        const activeFilter = active === 'true' ? true : active === 'false' ? false : undefined;
        return await this.buttonsService.findAll(activeFilter);
    }
    async testButtonConfig(config) {
        return await this.buttonsService.testButtonConfig(config);
    }
    async findOne(id) {
        return await this.buttonsService.findOne(id);
    }
    async create(createButtonDto) {
        return await this.buttonsService.create(createButtonDto);
    }
    async update(id, updateButtonDto) {
        return await this.buttonsService.update(id, updateButtonDto);
    }
    async remove(id) {
        return await this.buttonsService.remove(id);
    }
    async testButton(id, testData) {
        return await this.buttonsService.testButton(id, testData);
    }
    async exportButton(id) {
        return await this.buttonsService.exportButton(id);
    }
};
exports.ButtonsController = ButtonsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all buttons' }),
    __param(0, (0, common_1.Query)('active')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ButtonsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)('test-config'),
    (0, swagger_1.ApiOperation)({ summary: 'Test button configuration without saving' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ButtonsController.prototype, "testButtonConfig", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get button by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ButtonsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create new button' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_button_dto_1.CreateButtonDto]),
    __metadata("design:returntype", Promise)
], ButtonsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update button' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_button_dto_1.UpdateButtonDto]),
    __metadata("design:returntype", Promise)
], ButtonsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete button' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ButtonsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/test'),
    (0, swagger_1.ApiOperation)({ summary: 'Test button configuration' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ButtonsController.prototype, "testButton", null);
__decorate([
    (0, common_1.Post)(':id/export'),
    (0, swagger_1.ApiOperation)({ summary: 'Export button configuration as JSON' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ButtonsController.prototype, "exportButton", null);
exports.ButtonsController = ButtonsController = __decorate([
    (0, swagger_1.ApiTags)('admin'),
    (0, common_1.Controller)('admin/buttons'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [buttons_service_1.ButtonsService])
], ButtonsController);
//# sourceMappingURL=buttons.controller.js.map