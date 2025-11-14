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
exports.PremiumController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const premium_service_1 = require("./premium.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const admin_guard_1 = require("../auth/guards/admin.guard");
let PremiumController = class PremiumController {
    constructor(premiumService) {
        this.premiumService = premiumService;
    }
    async getAllRequests(status, currency) {
        return await this.premiumService.getAllRequests(status, currency);
    }
    async markRequisitesSent(id, req) {
        return await this.premiumService.markRequisitesSent(id, req.user.tg_id);
    }
    async confirmPayment(id, req) {
        return await this.premiumService.confirmPayment(id, req.user.tg_id);
    }
    async activateSubscription(id, req) {
        return await this.premiumService.activateSubscription(id, req.user.tg_id);
    }
    async cancelRequest(id, reason) {
        return await this.premiumService.cancelRequest(id, reason);
    }
};
exports.PremiumController = PremiumController;
__decorate([
    (0, common_1.Get)('requests'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all premium requests' }),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('currency')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PremiumController.prototype, "getAllRequests", null);
__decorate([
    (0, common_1.Post)('requests/:id/requisites-sent'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark requisites as sent' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PremiumController.prototype, "markRequisitesSent", null);
__decorate([
    (0, common_1.Post)('requests/:id/confirm-payment'),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm payment received' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PremiumController.prototype, "confirmPayment", null);
__decorate([
    (0, common_1.Post)('requests/:id/activate'),
    (0, swagger_1.ApiOperation)({ summary: 'Activate platinum subscription' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PremiumController.prototype, "activateSubscription", null);
__decorate([
    (0, common_1.Post)('requests/:id/cancel'),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel request' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PremiumController.prototype, "cancelRequest", null);
exports.PremiumController = PremiumController = __decorate([
    (0, swagger_1.ApiTags)('admin'),
    (0, common_1.Controller)('admin/premium'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [premium_service_1.PremiumService])
], PremiumController);
//# sourceMappingURL=premium.controller.js.map