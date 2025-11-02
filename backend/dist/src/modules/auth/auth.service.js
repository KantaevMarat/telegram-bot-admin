"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
const admin_entity_1 = require("../../entities/admin.entity");
const user_entity_1 = require("../../entities/user.entity");
const telegram_auth_service_1 = require("./telegram-auth.service");
let AuthService = AuthService_1 = class AuthService {
    constructor(adminRepo, userRepo, jwtService, configService, telegramAuthService) {
        this.adminRepo = adminRepo;
        this.userRepo = userRepo;
        this.jwtService = jwtService;
        this.configService = configService;
        this.telegramAuthService = telegramAuthService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    validateTelegramWebAppData(initData) {
        this.logger.debug('Validating Telegram Web App data');
        const botToken = this.configService.get('TELEGRAM_BOT_TOKEN');
        if (!botToken) {
            this.logger.error('Bot token not configured');
            throw new common_1.UnauthorizedException('Bot token not configured');
        }
        try {
            const urlParams = new URLSearchParams(initData);
            const hash = urlParams.get('hash');
            urlParams.delete('hash');
            this.logger.debug(`Hash from initData: ${hash?.substring(0, 10)}...`);
            this.logger.debug(`Params count: ${urlParams.size}`);
            const dataCheckArray = [];
            for (const [key, value] of Array.from(urlParams.entries()).sort()) {
                dataCheckArray.push(`${key}=${value}`);
            }
            const dataCheckString = dataCheckArray.join('\n');
            this.logger.debug(`Sorted params count: ${dataCheckArray.length}`);
            const secretKey = crypto.createHmac('sha256', botToken).update('WebAppData').digest();
            this.logger.debug('Secret key calculated');
            const calculatedHash = crypto
                .createHmac('sha256', secretKey)
                .update(dataCheckString)
                .digest('hex');
            const hashMatch = calculatedHash === hash;
            this.logger.debug(`Hash validation: ${hashMatch ? 'success' : 'failed'}`);
            if (!hashMatch) {
                this.logger.warn('Hash validation failed');
                throw new common_1.UnauthorizedException('Invalid hash');
            }
            const userParam = urlParams.get('user');
            if (!userParam) {
                this.logger.error('User data not found in initData');
                throw new common_1.UnauthorizedException('User data not found');
            }
            this.logger.debug('Parsing user data');
            const userData = JSON.parse(userParam);
            this.logger.debug(`User data parsed: ID ${userData.id}`);
            return userData;
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid Telegram data');
        }
    }
    async loginAdmin(initData) {
        this.logger.log('🔐 Admin login attempt');
        try {
            const telegramData = this.telegramAuthService.validateInitData(initData);
            const userData = telegramData.user;
            if (!userData) {
                this.logger.error('❌ User data not found in initData');
                throw new common_1.UnauthorizedException('User data not found in initData');
            }
            this.logger.log(`✅ User data validated: ID ${userData.id}, Name: ${userData.first_name}`);
            const admin = await this.adminRepo.findOne({
                where: { tg_id: userData.id.toString() },
            });
            if (!admin) {
                this.logger.warn(`⚠️ Admin not found for TG ID: ${userData.id}`);
                this.logger.warn(`💡 Add yourself as admin: npm run cli:add-admin ${userData.id} admin`);
                const allAdmins = await this.adminRepo.find();
                this.logger.debug(`📋 Total admins in DB: ${allAdmins.length}`);
                allAdmins.forEach(a => this.logger.debug(`  - Admin: tg_id="${a.tg_id}", username="${a.username || 'N/A'}"`));
                throw new common_1.UnauthorizedException(`Not authorized as admin. Your Telegram ID: ${userData.id}`);
            }
            this.logger.debug(`Admin found: ${admin.username || admin.tg_id}, role: ${admin.role}`);
            admin.username = userData.username || admin.username;
            admin.first_name = userData.first_name || admin.first_name;
            await this.adminRepo.save(admin);
            const payload = {
                sub: admin.id,
                tg_id: admin.tg_id,
                role: admin.role,
                type: 'admin',
            };
            const result = {
                access_token: this.jwtService.sign(payload),
                admin: {
                    id: admin.id,
                    tg_id: admin.tg_id,
                    username: admin.username,
                    first_name: admin.first_name,
                    role: admin.role,
                },
            };
            this.logger.log(`Admin login successful: ${admin.username || admin.tg_id}`);
            return result;
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            this.logger.error('❌ Error during admin login:', error.message);
            throw new common_1.UnauthorizedException(`Login failed: ${error.message}`);
        }
    }
    async loginUser(initData) {
        const userData = this.validateTelegramWebAppData(initData);
        let user = await this.userRepo.findOne({
            where: { tg_id: userData.id.toString() },
        });
        if (!user) {
            user = this.userRepo.create({
                tg_id: userData.id.toString(),
                username: userData.username,
                first_name: userData.first_name,
                last_name: userData.last_name,
                status: 'active',
            });
            await this.userRepo.save(user);
        }
        else {
            user.username = userData.username || user.username;
            user.first_name = userData.first_name || user.first_name;
            user.last_name = userData.last_name || user.last_name;
            await this.userRepo.save(user);
        }
        const payload = {
            sub: user.id,
            tg_id: user.tg_id,
            type: 'user',
        };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                tg_id: user.tg_id,
                username: user.username,
                first_name: user.first_name,
                balance_usdt: user.balance_usdt,
                tasks_completed: user.tasks_completed,
            },
        };
    }
    async validateAdmin(tg_id) {
        const admin = await this.adminRepo.findOne({ where: { tg_id } });
        if (!admin) {
            throw new common_1.UnauthorizedException('Admin not found');
        }
        return admin;
    }
    async validateUser(tg_id) {
        const user = await this.userRepo.findOne({ where: { tg_id } });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return user;
    }
    async devLogin(adminId) {
        this.logger.log(`Development login attempt for admin ID: ${adminId}`);
        this.logger.log(`Searching for admin with tg_id: "${adminId.toString()}"`);
        const allAdmins = await this.adminRepo.find();
        this.logger.log(`Total admins in DB: ${allAdmins.length}`);
        allAdmins.forEach(a => this.logger.log(`  - Admin: tg_id="${a.tg_id}", role=${a.role}`));
        const admin = await this.adminRepo.findOne({
            where: { tg_id: adminId.toString() },
        });
        if (!admin) {
            this.logger.warn(`Admin not found for TG ID: ${adminId}`);
            throw new common_1.UnauthorizedException('Admin not found');
        }
        const payload = {
            sub: admin.id,
            tg_id: admin.tg_id,
            role: admin.role,
            type: 'admin',
        };
        const result = {
            access_token: this.jwtService.sign(payload),
            admin: {
                id: admin.id,
                tg_id: admin.tg_id,
                username: admin.username,
                first_name: admin.first_name,
                role: admin.role,
            },
        };
        this.logger.log(`Development login successful: ${admin.tg_id}`);
        return result;
    }
    async debugAdminLookup() {
        const allAdmins = await this.adminRepo.find();
        const searchTgId = '697184435';
        const foundByString = await this.adminRepo.findOne({
            where: { tg_id: searchTgId },
        });
        return {
            totalAdmins: allAdmins.length,
            searchingFor: searchTgId,
            searchingForType: typeof searchTgId,
            foundByString: foundByString ? 'YES' : 'NO',
            allAdminsInDb: allAdmins.map(a => ({
                id: a.id,
                tg_id: a.tg_id,
                tg_id_type: typeof a.tg_id,
                role: a.role,
                username: a.username,
                matchesSearch: a.tg_id === searchTgId,
                toStringMatches: a.tg_id.toString() === searchTgId,
            })),
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(admin_entity_1.Admin)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService,
        config_1.ConfigService,
        telegram_auth_service_1.TelegramAuthService])
], AuthService);
//# sourceMappingURL=auth.service.js.map