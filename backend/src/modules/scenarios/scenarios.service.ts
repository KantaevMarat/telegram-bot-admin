import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scenario } from '../../entities/scenario.entity';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';

@Injectable()
export class ScenariosService {
  constructor(
    @InjectRepository(Scenario)
    private scenarioRepo: Repository<Scenario>,
  ) {}

  async create(createScenarioDto: CreateScenarioDto) {
    const scenario = this.scenarioRepo.create(createScenarioDto);
    return await this.scenarioRepo.save(scenario);
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
    return await this.scenarioRepo.save(scenario);
  }

  async remove(id: string) {
    const scenario = await this.findOne(id);
    await this.scenarioRepo.remove(scenario);
    return { success: true, message: 'Scenario removed' };
  }
}
