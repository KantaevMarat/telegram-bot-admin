import { Repository } from 'typeorm';
import { Button } from '../../entities/button.entity';
import { CreateButtonDto } from './dto/create-button.dto';
import { UpdateButtonDto } from './dto/update-button.dto';
import { SyncService } from '../sync/sync.service';
export declare class ButtonsService {
    private buttonRepo;
    private syncService;
    constructor(buttonRepo: Repository<Button>, syncService: SyncService);
    create(createButtonDto: CreateButtonDto): Promise<Button>;
    findAll(active?: boolean): Promise<Button[]>;
    findOne(id: string): Promise<Button>;
    update(id: string, updateButtonDto: UpdateButtonDto): Promise<Button>;
    remove(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
