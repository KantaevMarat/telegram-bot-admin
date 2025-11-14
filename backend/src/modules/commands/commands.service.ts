import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Command } from '../../entities/command.entity';
import { CreateCommandDto } from './dto/create-command.dto';
import { UpdateCommandDto } from './dto/update-command.dto';

@Injectable()
export class CommandsService {
  constructor(
    @InjectRepository(Command)
    private commandRepo: Repository<Command>,
  ) {}

  async create(createCommandDto: CreateCommandDto): Promise<Command> {
    // Check if command with same name already exists
    const existing = await this.commandRepo.findOne({
      where: { name: createCommandDto.name },
    });

    if (existing) {
      throw new ConflictException('Command with this name already exists');
    }

    const command = this.commandRepo.create(createCommandDto);
    return this.commandRepo.save(command);
  }

  async findAll(): Promise<Command[]> {
    return this.commandRepo.find({
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Command> {
    const command = await this.commandRepo.findOne({ where: { id } });
    
    if (!command) {
      throw new NotFoundException('Command not found');
    }

    return command;
  }

  async findByName(name: string): Promise<Command | null> {
    return this.commandRepo.findOne({ where: { name, active: true } });
  }

  async update(id: string, updateCommandDto: UpdateCommandDto): Promise<Command> {
    const command = await this.findOne(id);

    // If updating name, check for conflicts
    if (updateCommandDto.name && updateCommandDto.name !== command.name) {
      const existing = await this.commandRepo.findOne({
        where: { name: updateCommandDto.name },
      });

      if (existing) {
        throw new ConflictException('Command with this name already exists');
      }
    }

    Object.assign(command, updateCommandDto);
    return this.commandRepo.save(command);
  }

  async remove(id: string): Promise<void> {
    const command = await this.findOne(id);
    await this.commandRepo.remove(command);
  }
}

