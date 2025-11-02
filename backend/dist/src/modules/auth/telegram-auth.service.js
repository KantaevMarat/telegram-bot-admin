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
var TelegramAuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramAuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
let TelegramAuthService = TelegramAuthService_1 = class TelegramAuthService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(TelegramAuthService_1.name);
        this.adminBotToken = this.configService.get('ADMIN_BOT_TOKEN') || '';
        this.userBotToken = this.configService.get('TELEGRAM_BOT_TOKEN') || '';
        if (!this.adminBotToken) {
            this.logger.warn('⚠️ ADMIN_BOT_TOKEN is not configured!');
        }
    }
    validateInitData(initData) {
        try {
            this.logger.debug(`🔍 Validating initData: ${initData.substring(0, 50)}...`);
            const params = new URLSearchParams(initData);
            const hash = params.get('hash');
            if (!hash) {
                throw new common_1.UnauthorizedException('Missing hash in initData');
            }
            params.delete('hash');
            const dataCheckString = Array.from(params.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => `${key}=${value}`)
                .join('\n');
            this.logger.debug(`📝 Data check string:\n${dataCheckString}`);
            const tokens = [
                { name: 'ADMIN_BOT_TOKEN', token: this.adminBotToken },
                { name: 'TELEGRAM_BOT_TOKEN', token: this.userBotToken },
            ].filter(t => t.token);
            let isValid = false;
            for (const { name, token } of tokens) {
                try {
                    const secretKey = (0, crypto_1.createHmac)('sha256', 'WebAppData')
                        .update(token)
                        .digest();
                    const calculatedHash = (0, crypto_1.createHmac)('sha256', secretKey)
                        .update(dataCheckString)
                        .digest('hex');
                    this.logger.debug(`🔐 [${name}] Calculated: ${calculatedHash.substring(0, 10)}...`);
                    this.logger.debug(`🔐 [${name}] Received: ${hash.substring(0, 10)}...`);
                    if (calculatedHash === hash) {
                        this.logger.log(`✅ Valid initData signature with ${name}`);
                        isValid = true;
                        break;
                    }
                }
                catch (tokenError) {
                    this.logger.debug(`⚠️ Error validating with ${name}:`, tokenError.message);
                }
            }
            if (!isValid) {
                this.logger.error('❌ Invalid initData signature with all tokens');
                throw new common_1.UnauthorizedException('Invalid initData signature');
            }
            const authDate = parseInt(params.get('auth_date') || '0');
            const now = Math.floor(Date.now() / 1000);
            const maxAge = 24 * 60 * 60;
            if (now - authDate > maxAge) {
                throw new common_1.UnauthorizedException('initData is too old');
            }
            const userJson = params.get('user');
            let user = null;
            if (userJson) {
                try {
                    user = JSON.parse(userJson);
                }
                catch (error) {
                    this.logger.error('Failed to parse user data:', error);
                }
            }
            const result = {
                query_id: params.get('query_id') || undefined,
                user,
                auth_date: authDate,
                hash,
            };
            this.logger.log(`✅ Valid initData for user: ${user?.id || 'unknown'} (${user?.first_name || 'N/A'})`);
            return result;
        }
        catch (error) {
            this.logger.error('❌ Failed to validate initData:', error.message);
            throw new common_1.UnauthorizedException('Invalid initData');
        }
    }
    createMockInitData(userId, firstName = 'Test User') {
        const authDate = Math.floor(Date.now() / 1000);
        return {
            user: {
                id: userId,
                first_name: firstName,
                username: 'testuser',
                language_code: 'ru',
            },
            auth_date: authDate,
            hash: 'mock_hash_for_development',
        };
    }
};
exports.TelegramAuthService = TelegramAuthService;
exports.TelegramAuthService = TelegramAuthService = TelegramAuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TelegramAuthService);
//# sourceMappingURL=telegram-auth.service.js.map