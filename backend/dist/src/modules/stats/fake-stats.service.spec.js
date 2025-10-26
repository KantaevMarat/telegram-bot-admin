"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const fake_stats_service_1 = require("./fake-stats.service");
const fake_stats_entity_1 = require("../../entities/fake-stats.entity");
const real_stats_snapshot_entity_1 = require("../../entities/real-stats-snapshot.entity");
const user_entity_1 = require("../../entities/user.entity");
describe('FakeStatsService', () => {
    let service;
    const mockFakeStatsRepository = {
        findOne: jest.fn(),
        find: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(null),
        })),
    };
    const mockRealStatsRepository = {
        create: jest.fn(),
        save: jest.fn(),
    };
    const mockUserRepository = {
        count: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue({ total: 100 }),
            where: jest.fn().mockReturnThis(),
            getCount: jest.fn().mockResolvedValue(10),
        })),
    };
    const mockConfigService = {
        get: jest.fn((key, defaultValue) => defaultValue),
    };
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                fake_stats_service_1.FakeStatsService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(fake_stats_entity_1.FakeStats),
                    useValue: mockFakeStatsRepository,
                },
                {
                    provide: (0, typeorm_1.getRepositoryToken)(real_stats_snapshot_entity_1.RealStatsSnapshot),
                    useValue: mockRealStatsRepository,
                },
                {
                    provide: (0, typeorm_1.getRepositoryToken)(user_entity_1.User),
                    useValue: mockUserRepository,
                },
                {
                    provide: config_1.ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();
        service = module.get(fake_stats_service_1.FakeStatsService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    describe('getLatestFakeStats', () => {
        it('should return latest fake stats', async () => {
            const mockStats = {
                id: '1',
                online: 1000,
                active: 5000,
                paid_usdt: 10000,
                calculated_at: new Date(),
            };
            mockFakeStatsRepository.createQueryBuilder.mockReturnValue({
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockStats),
            });
            const result = await service.getLatestFakeStats();
            expect(result).toEqual(mockStats);
            expect(mockFakeStatsRepository.createQueryBuilder).toHaveBeenCalled();
        });
    });
    describe('smoothRandomWalk', () => {
        it('should generate value within bounds', () => {
            const previousValue = 1000;
            const realValue = 1000;
            const maxDeltaPercent = 15;
            const result = service.smoothRandomWalk(previousValue, realValue, maxDeltaPercent, -0.02, 0.03, 0.01);
            expect(result).toBeGreaterThanOrEqual(realValue * 0.85);
            expect(result).toBeLessThanOrEqual(realValue * 1.15);
        });
    });
});
//# sourceMappingURL=fake-stats.service.spec.js.map