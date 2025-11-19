import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Command } from '../../entities/command.entity';
import { CreateCommandDto } from './dto/create-command.dto';
import { UpdateCommandDto } from './dto/update-command.dto';

@Injectable()
export class CommandsService {
  // Simple in-memory cache for frequently used commands
  private commandCache: Map<string, { command: Command | null; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 60 seconds

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
    // Normalize name: remove leading slash if present
    const normalizedName = name.startsWith('/') ? name.substring(1) : name;
    
    // Check cache first
    const cacheKey = normalizedName;
    const cached = this.commandCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.command;
    }
    
    // Use single query with OR condition for better performance
    const command = await this.commandRepo.findOne({
      where: [
        { name: normalizedName, active: true },
        { name: `/${normalizedName}`, active: true },
      ],
    });
    
    // Update cache
    this.commandCache.set(cacheKey, {
      command,
      timestamp: Date.now(),
    });
    
    return command;
  }

  async update(id: string, updateCommandDto: UpdateCommandDto): Promise<Command> {
    const command = await this.findOne(id);
    
    // Clear cache for this command
    const oldName = command.name;
    const normalizedOldName = oldName.startsWith('/') ? oldName.substring(1) : oldName;
    this.commandCache.delete(normalizedOldName);
    
    if (updateCommandDto.name) {
      const normalizedNewName = updateCommandDto.name.startsWith('/') 
        ? updateCommandDto.name.substring(1) 
        : updateCommandDto.name;
      this.commandCache.delete(normalizedNewName);
    }

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
    
    // Clear cache for this command
    const normalizedName = command.name.startsWith('/') 
      ? command.name.substring(1) 
      : command.name;
    this.commandCache.delete(normalizedName);
    
    await this.commandRepo.remove(command);
  }
}

