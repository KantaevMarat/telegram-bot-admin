import { ButtonsService } from './buttons.service';
import { CreateButtonDto } from './dto/create-button.dto';
import { UpdateButtonDto } from './dto/update-button.dto';
export declare class ButtonsController {
    private readonly buttonsService;
    constructor(buttonsService: ButtonsService);
    findAll(active?: string): Promise<import("../../entities/button.entity").Button[]>;
    findOne(id: string): Promise<import("../../entities/button.entity").Button>;
    create(createButtonDto: CreateButtonDto): Promise<import("../../entities/button.entity").Button>;
    update(id: string, updateButtonDto: UpdateButtonDto): Promise<import("../../entities/button.entity").Button>;
    remove(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
