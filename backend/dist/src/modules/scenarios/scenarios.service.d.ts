import { Repository } from 'typeorm';
import { Scenario } from '../../entities/scenario.entity';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';
import { SyncService } from '../sync/sync.service';
export declare class ScenariosService {
    private scenarioRepo;
    private syncService;
    constructor(scenarioRepo: Repository<Scenario>, syncService: SyncService);
    create(createScenarioDto: CreateScenarioDto): Promise<Scenario>;
    findAll(active?: boolean): Promise<Scenario[]>;
    findOne(id: string): Promise<Scenario>;
    findByTrigger(trigger: string): Promise<Scenario | null>;
    update(id: string, updateScenarioDto: UpdateScenarioDto): Promise<Scenario>;
    remove(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
