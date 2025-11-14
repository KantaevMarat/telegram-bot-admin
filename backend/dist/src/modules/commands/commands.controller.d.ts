import { CommandsService } from './commands.service';
import { CreateCommandDto } from './dto/create-command.dto';
import { UpdateCommandDto } from './dto/update-command.dto';
export declare class CommandsController {
    private readonly commandsService;
    constructor(commandsService: CommandsService);
    create(createCommandDto: CreateCommandDto): Promise<import("../../entities/command.entity").Command>;
    findAll(): Promise<import("../../entities/command.entity").Command[]>;
    findOne(id: string): Promise<import("../../entities/command.entity").Command>;
    update(id: string, updateCommandDto: UpdateCommandDto): Promise<import("../../entities/command.entity").Command>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
