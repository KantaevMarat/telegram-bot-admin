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
exports.SettingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const settings_service_1 = require("./settings.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const admin_guard_1 = require("../auth/guards/admin.guard");
let SettingsController = class SettingsController {
    constructor(settingsService) {
        this.settingsService = settingsService;
    }
    async findAll() {
        return await this.settingsService.findAll();
    }
    async findOne(key) {
        return await this.settingsService.findOne(key);
    }
    async updateOne(key, body, req, headers) {
        const adminTgId = req.user.tg_id;
        const adminUsername = req.user.username;
        const adminFirstName = req.user.first_name;
        const ipAddress = headers['x-forwarded-for'] || headers['x-real-ip'] || req.connection.remoteAddress;
        const userAgent = headers['user-agent'];
        return await this.settingsService.updateOne(key, body.value, adminTgId, adminUsername, adminFirstName, 'Single setting update', ipAddress, userAgent);
    }
    async updateAll(body, req, headers) {
        const adminTgId = req.user.tg_id;
        const adminUsername = req.user.username;
        const adminFirstName = req.user.first_name;
        const ipAddress = headers['x-forwarded-for'] || headers['x-real-ip'] || req.connection.remoteAddress;
        const userAgent = headers['user-agent'];
        const changeReason = body.settings.length > 1 ? 'Bulk update' : 'Single setting update';
        console.log('📝 Updating settings:', JSON.stringify(body.settings, null, 2));
        return await this.settingsService.updateAll(body.settings, adminTgId, adminUsername, adminFirstName, changeReason, ipAddress, userAgent);
    }
    async remove(key) {
        return await this.settingsService.remove(key);
    }
    async getSettingsByCategories() {
        return await this.settingsService.getSettingsByCategories();
    }
    async getSettingsByCategory(category) {
        return await this.settingsService.getSettingsByCategory(category);
    }
    async validateSettings(body) {
        return await this.settingsService.validateSettings(body.settings);
    }
    async exportSettings() {
        return await this.settingsService.exportSettings();
    }
    async importSettings(body, req, headers) {
        const adminTgId = req.user.tg_id;
        const adminUsername = req.user.username;
        const adminFirstName = req.user.first_name;
        const ipAddress = headers['x-forwarded-for'] || headers['x-real-ip'] || req.connection.remoteAddress;
        const userAgent = headers['user-agent'];
        return await this.settingsService.importSettings(body.settings, adminTgId, adminUsername, adminFirstName, 'Settings import', ipAddress, userAgent);
    }
    async resetSettings(body, req, headers) {
        const adminTgId = req.user.tg_id;
        const adminUsername = req.user.username;
        const adminFirstName = req.user.first_name;
        const ipAddress = headers['x-forwarded-for'] || headers['x-real-ip'] || req.connection.remoteAddress;
        const userAgent = headers['user-agent'];
        return await this.settingsService.resetSettings(body.categories, adminTgId, adminUsername, adminFirstName, 'Settings reset', ipAddress, userAgent);
    }
    async getSettingsHistory(limit, offset) {
        return await this.settingsService.getSettingsHistory(limit ? parseInt(limit) : 50, offset ? parseInt(offset) : 0);
    }
    async searchSettings(query, category) {
        return await this.settingsService.searchSettings(query, category);
    }
    async bulkUpdateSettings(body, req, headers) {
        const adminTgId = req.user.tg_id;
        const adminUsername = req.user.username;
        const adminFirstName = req.user.first_name;
        const ipAddress = headers['x-forwarded-for'] || headers['x-real-ip'] || req.connection.remoteAddress;
        const userAgent = headers['user-agent'];
        return await this.settingsService.bulkUpdateSettings(body.settings, adminTgId, adminUsername, adminFirstName, 'Bulk update with validation', ipAddress, userAgent);
    }
};
exports.SettingsController = SettingsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all settings' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':key'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a specific setting by key' }),
    __param(0, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':key'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a single setting by key' }),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "updateOne", null);
__decorate([
    (0, common_1.Put)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update multiple settings' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "updateAll", null);
__decorate([
    (0, common_1.Delete)(':key'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a setting' }),
    __param(0, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('categories'),
    (0, swagger_1.ApiOperation)({ summary: 'Get settings grouped by categories' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getSettingsByCategories", null);
__decorate([
    (0, common_1.Get)('category/:category'),
    (0, swagger_1.ApiOperation)({ summary: 'Get settings by category' }),
    __param(0, (0, common_1.Param)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getSettingsByCategory", null);
__decorate([
    (0, common_1.Post)('validate'),
    (0, swagger_1.ApiOperation)({ summary: 'Validate settings' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "validateSettings", null);
__decorate([
    (0, common_1.Post)('export'),
    (0, swagger_1.ApiOperation)({ summary: 'Export all settings' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "exportSettings", null);
__decorate([
    (0, common_1.Post)('import'),
    (0, swagger_1.ApiOperation)({ summary: 'Import settings' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "importSettings", null);
__decorate([
    (0, common_1.Post)('reset'),
    (0, swagger_1.ApiOperation)({ summary: 'Reset settings to defaults' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "resetSettings", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, swagger_1.ApiOperation)({ summary: 'Get settings change history' }),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getSettingsHistory", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, swagger_1.ApiOperation)({ summary: 'Search settings' }),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "searchSettings", null);
__decorate([
    (0, common_1.Post)('bulk-update'),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk update settings with validation' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "bulkUpdateSettings", null);
exports.SettingsController = SettingsController = __decorate([
    (0, swagger_1.ApiTags)('admin'),
    (0, common_1.Controller)('admin/settings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [settings_service_1.SettingsService])
], SettingsController);
//# sourceMappingURL=settings.controller.js.map