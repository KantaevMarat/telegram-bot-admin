import { ScenariosService } from './scenarios.service';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';
export declare class ScenariosController {
    private readonly scenariosService;
    constructor(scenariosService: ScenariosService);
    findAll(active?: string): Promise<import("../../entities/scenario.entity").Scenario[]>;
    findOne(id: string): Promise<import("../../entities/scenario.entity").Scenario>;
    create(createScenarioDto: CreateScenarioDto): Promise<import("../../entities/scenario.entity").Scenario>;
    update(id: string, updateScenarioDto: UpdateScenarioDto): Promise<import("../../entities/scenario.entity").Scenario>;
    remove(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
