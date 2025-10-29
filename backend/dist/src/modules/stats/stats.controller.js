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
exports.StatsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const stats_service_1 = require("./stats.service");
const fake_stats_service_1 = require("./fake-stats.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let StatsController = class StatsController {
    constructor(statsService, fakeStatsService) {
        this.statsService = statsService;
        this.fakeStatsService = fakeStatsService;
    }
    async getStats() {
        return await this.statsService.getCombinedStats();
    }
    async getRealStats() {
        return await this.statsService.getRealStats();
    }
    async getFakeStats() {
        return await this.fakeStatsService.getLatestFakeStats();
    }
    async getStatsHistory(days) {
        return await this.statsService.getStatsHistory(days ? parseInt(days.toString()) : 30);
    }
    async regenerateFakeStats() {
        try {
            const newStats = await this.fakeStatsService.regenerateFakeStats();
            return {
                success: true,
                message: 'Fake statistics regenerated successfully',
                data: newStats,
            };
        }
        catch (error) {
            console.error('❌ Error regenerating fake stats:', error);
            throw error;
        }
    }
    async getTopUsers(limit) {
        return await this.statsService.getTopUsers(limit ? parseInt(limit.toString()) : 10);
    }
};
exports.StatsController = StatsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get combined statistics (real + fake)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StatsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('real'),
    (0, swagger_1.ApiOperation)({ summary: 'Get real statistics only' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StatsController.prototype, "getRealStats", null);
__decorate([
    (0, common_1.Get)('fake'),
    (0, swagger_1.ApiOperation)({ summary: 'Get fake statistics only' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StatsController.prototype, "getFakeStats", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, swagger_1.ApiOperation)({ summary: 'Get stats history for charts' }),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], StatsController.prototype, "getStatsHistory", null);
__decorate([
    (0, common_1.Post)('fake/regenerate'),
    (0, swagger_1.ApiOperation)({ summary: 'Manually regenerate fake statistics' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StatsController.prototype, "regenerateFakeStats", null);
__decorate([
    (0, common_1.Get)('top-users'),
    (0, swagger_1.ApiOperation)({ summary: 'Get top users by balance, earned, tasks' }),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], StatsController.prototype, "getTopUsers", null);
exports.StatsController = StatsController = __decorate([
    (0, swagger_1.ApiTags)('admin'),
    (0, common_1.Controller)('admin/stats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [stats_service_1.StatsService,
        fake_stats_service_1.FakeStatsService])
], StatsController);
//# sourceMappingURL=stats.controller.js.map