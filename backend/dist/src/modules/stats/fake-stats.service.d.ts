import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { FakeStats } from '../../entities/fake-stats.entity';
import { RealStatsSnapshot } from '../../entities/real-stats-snapshot.entity';
import { User } from '../../entities/user.entity';
export declare class FakeStatsService {
    private fakeStatsRepo;
    private realStatsRepo;
    private userRepo;
    private configService;
    private readonly logger;
    constructor(fakeStatsRepo: Repository<FakeStats>, realStatsRepo: Repository<RealStatsSnapshot>, userRepo: Repository<User>, configService: ConfigService);
    updateFakeStatsCron(): Promise<void>;
    regenerateFakeStats(): Promise<FakeStats>;
    getLatestFakeStats(): Promise<FakeStats>;
    getFakeStatsHistory(limit?: number): Promise<FakeStats[]>;
    private initializeFakeStats;
    private generateAndSaveFakeStats;
    private smoothRandomWalk;
    private getRealStats;
    private saveRealStatsSnapshot;
    private randomUniform;
    private randomGaussian;
    private clamp;
}
