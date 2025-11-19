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
exports.RanksController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const ranks_service_1 = require("./ranks.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const admin_guard_1 = require("../auth/guards/admin.guard");
const sync_service_1 = require("../sync/sync.service");
let RanksController = class RanksController {
    constructor(ranksService, syncService) {
        this.ranksService = ranksService;
        this.syncService = syncService;
    }
    async getSettings() {
        return await this.ranksService.getSettings();
    }
    async updateSettings(data) {
        const result = await this.ranksService.updateSettings(data);
        await this.syncService.publish('ranks.settings_updated', result);
        return result;
    }
    async getStatistics() {
        return await this.ranksService.getRankStatistics();
    }
    async getUserRank(userId) {
        const rank = await this.ranksService.getUserRank(userId);
        const progress = await this.ranksService.getRankProgress(userId);
        return { rank, progress };
    }
    async checkUserRank(userId) {
        return await this.ranksService.checkAndUpdateRank(userId);
    }
};
exports.RanksController = RanksController;
__decorate([
    (0, common_1.Get)('settings'),
    (0, swagger_1.ApiOperation)({ summary: 'Get rank settings' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RanksController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Put)('settings'),
    (0, swagger_1.ApiOperation)({ summary: 'Update rank settings' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RanksController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Get)('statistics'),
    (0, swagger_1.ApiOperation)({ summary: 'Get rank statistics' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RanksController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user rank info' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RanksController.prototype, "getUserRank", null);
__decorate([
    (0, common_1.Put)('user/:userId/check'),
    (0, swagger_1.ApiOperation)({ summary: 'Check and update user rank' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RanksController.prototype, "checkUserRank", null);
exports.RanksController = RanksController = __decorate([
    (0, swagger_1.ApiTags)('admin'),
    (0, common_1.Controller)('admin/ranks'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [ranks_service_1.RanksService,
        sync_service_1.SyncService])
], RanksController);
//# sourceMappingURL=ranks.controller.js.map