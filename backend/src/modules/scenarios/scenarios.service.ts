import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scenario } from '../../entities/scenario.entity';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';
import { SyncService } from '../sync/sync.service';

@Injectable()
export class ScenariosService {
  constructor(
    @InjectRepository(Scenario)
    private scenarioRepo: Repository<Scenario>,
    private syncService: SyncService,
  ) {}

  async create(createScenarioDto: CreateScenarioDto) {
    const scenario = this.scenarioRepo.create(createScenarioDto);
    const saved = await this.scenarioRepo.save(scenario);
    
    // Emit sync event
    await this.syncService.emitEntityEvent('scenarios', 'created', saved);
    
    return saved;
  }

  async findAll(active?: boolean) {
    const where = active !== undefined ? { active } : {};
    return await this.scenarioRepo.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string) {
    const scenario = await this.scenarioRepo.findOne({ where: { id } });
    if (!scenario) {
      throw new NotFoundException('Scenario not found');
    }
    return scenario;
  }

  async findByTrigger(trigger: string) {
    return await this.scenarioRepo.findOne({
      where: { trigger, active: true },
    });
  }

  async update(id: string, updateScenarioDto: UpdateScenarioDto) {
    const scenario = await this.findOne(id);
    Object.assign(scenario, updateScenarioDto);
    const updated = await this.scenarioRepo.save(scenario);
    
    // Emit sync event
    await this.syncService.emitEntityEvent('scenarios', 'updated', updated);
    
    return updated;
  }

  async remove(id: string) {
    const scenario = await this.findOne(id);
    await this.scenarioRepo.remove(scenario);
    
    // Emit sync event
    await this.syncService.emitEntityEvent('scenarios', 'deleted', { id });
    
    return { success: true, message: 'Scenario removed' };
  }
}
