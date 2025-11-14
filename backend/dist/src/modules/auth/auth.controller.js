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
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dto/login.dto");
let AuthController = AuthController_1 = class AuthController {
    constructor(authService) {
        this.authService = authService;
        this.logger = new common_1.Logger(AuthController_1.name);
    }
    async loginAdmin(loginDto) {
        this.logger.log(`📥 Admin login request received`);
        this.logger.debug(`initData present: ${!!loginDto.initData}`);
        this.logger.debug(`initData length: ${loginDto.initData?.length || 0}`);
        this.logger.debug(`initData preview: ${loginDto.initData?.substring(0, 50) || 'N/A'}...`);
        if (!loginDto.initData || loginDto.initData === 'dev') {
            this.logger.log('🔧 Development mode login detected');
            return await this.authService.devLogin(6971844353);
        }
        try {
            const result = await this.authService.loginAdmin(loginDto.initData);
            this.logger.log('✅ Admin login successful');
            return result;
        }
        catch (error) {
            this.logger.error('❌ Admin login failed:', error.message);
            throw error;
        }
    }
    async loginUser(loginDto) {
        return await this.authService.loginUser(loginDto.initData);
    }
    async testAdmins() {
        return await this.authService.debugAdminLookup();
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('telegram/admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Login as admin using Telegram Web App data' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "loginAdmin", null);
__decorate([
    (0, common_1.Post)('telegram/user'),
    (0, swagger_1.ApiOperation)({ summary: 'Login or register user using Telegram Web App data' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "loginUser", null);
__decorate([
    (0, common_1.Get)('test-admins'),
    (0, swagger_1.ApiOperation)({ summary: 'DEBUG: Test admin lookup' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "testAdmins", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map