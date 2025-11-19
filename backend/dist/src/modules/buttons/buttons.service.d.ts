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
    testButton(id: string, testData?: any): Promise<{
        success: boolean;
        payload: {
            button_id: string;
            label: string;
            action_type: string;
            action_payload: any;
            command: string;
        };
        response: {
            message: string;
            timestamp: string;
        };
        logs: string[];
    }>;
    testButtonConfig(config: any): Promise<{
        success: boolean;
        payload: {
            config: any;
            test_user_id: string;
            test_chat_id: string;
        };
        response: {
            message: string;
            timestamp: string;
        };
        logs: string[];
    } | {
        success: boolean;
        error: string;
    }>;
    exportButton(id: string): Promise<{
        id: string;
        label: string;
        action_type: string;
        action_payload: any;
        media_url: string;
        command: string;
        row: number;
        col: number;
        active: boolean;
        created_at: Date;
        updated_at: Date;
    }>;
}
