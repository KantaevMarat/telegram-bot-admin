import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { FakeStatsService } from './fake-stats.service';
import { FakeStats } from '../../entities/fake-stats.entity';
import { RealStatsSnapshot } from '../../entities/real-stats-snapshot.entity';
import { User } from '../../entities/user.entity';

describe('FakeStatsService', () => {
  let service: FakeStatsService;

  const mockFakeStatsRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
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
    get: jest.fn((key: string, defaultValue: any) => defaultValue),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FakeStatsService,
        {
          provide: getRepositoryToken(FakeStats),
          useValue: mockFakeStatsRepository,
        },
        {
          provide: getRepositoryToken(RealStatsSnapshot),
          useValue: mockRealStatsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FakeStatsService>(FakeStatsService);
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

      mockFakeStatsRepository.findOne.mockResolvedValue(mockStats);

      const result = await service.getLatestFakeStats();

      expect(result).toEqual(mockStats);
      expect(mockFakeStatsRepository.findOne).toHaveBeenCalled();
    });
  });

  describe('smoothRandomWalk', () => {
    it('should generate value within bounds', () => {
      const previousValue = 1000;
      const realValue = 1000;
      const maxDeltaPercent = 15;

      // Access private method through reflection for testing
      const result = (service as any).smoothRandomWalk(
        previousValue,
        realValue,
        maxDeltaPercent,
        -0.02,
        0.03,
        0.01,
      );

      // Should be within ±15% of real value
      expect(result).toBeGreaterThanOrEqual(realValue * 0.85);
      expect(result).toBeLessThanOrEqual(realValue * 1.15);
    });
  });
});

