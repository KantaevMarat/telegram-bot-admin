import { Repository } from 'typeorm';
import { Button } from '../../entities/button.entity';
import { CreateButtonDto } from './dto/create-button.dto';
import { UpdateButtonDto } from './dto/update-button.dto';
export declare class ButtonsService {
    private buttonRepo;
    constructor(buttonRepo: Repository<Button>);
    create(createButtonDto: CreateButtonDto): Promise<Button>;
    findAll(active?: boolean): Promise<Button[]>;
    findOne(id: string): Promise<Button>;
    update(id: string, updateButtonDto: UpdateButtonDto): Promise<Button>;
    remove(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
