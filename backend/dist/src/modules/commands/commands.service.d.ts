import { Repository } from 'typeorm';
import { Command } from '../../entities/command.entity';
import { CreateCommandDto } from './dto/create-command.dto';
import { UpdateCommandDto } from './dto/update-command.dto';
export declare class CommandsService {
    private commandRepo;
    private commandCache;
    private readonly CACHE_TTL;
    constructor(commandRepo: Repository<Command>);
    create(createCommandDto: CreateCommandDto): Promise<Command>;
    findAll(): Promise<Command[]>;
    findOne(id: string): Promise<Command>;
    findByName(name: string): Promise<Command | null>;
    update(id: string, updateCommandDto: UpdateCommandDto): Promise<Command>;
    remove(id: string): Promise<void>;
}
