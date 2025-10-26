"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const admin_entity_1 = require("../../entities/admin.entity");
const user_entity_1 = require("../../entities/user.entity");
describe('AuthService', () => {
    let service;
    let jwtService;
    const mockAdminRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
    };
    const mockUserRepository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };
    const mockJwtService = {
        sign: jest.fn(),
    };
    const mockConfigService = {
        get: jest.fn(),
    };
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                auth_service_1.AuthService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(admin_entity_1.Admin),
                    useValue: mockAdminRepository,
                },
                {
                    provide: (0, typeorm_1.getRepositoryToken)(user_entity_1.User),
                    useValue: mockUserRepository,
                },
                {
                    provide: jwt_1.JwtService,
                    useValue: mockJwtService,
                },
                {
                    provide: config_1.ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();
        service = module.get(auth_service_1.AuthService);
        jwtService = module.get(jwt_1.JwtService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    describe('validateAdmin', () => {
        it('should return admin if found', async () => {
            const mockAdmin = {
                id: '1',
                tg_id: '123456789',
                role: 'admin',
            };
            mockAdminRepository.findOne.mockResolvedValue(mockAdmin);
            const result = await service.validateAdmin('123456789');
            expect(result).toEqual(mockAdmin);
        });
        it('should throw UnauthorizedException if admin not found', async () => {
            mockAdminRepository.findOne.mockResolvedValue(null);
            await expect(service.validateAdmin('123456789')).rejects.toThrow(common_1.UnauthorizedException);
        });
    });
});
//# sourceMappingURL=auth.service.spec.js.map