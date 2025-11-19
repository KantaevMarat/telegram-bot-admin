import { ButtonsService } from './buttons.service';
import { CreateButtonDto } from './dto/create-button.dto';
import { UpdateButtonDto } from './dto/update-button.dto';
export declare class ButtonsController {
    private readonly buttonsService;
    constructor(buttonsService: ButtonsService);
    findAll(active?: string): Promise<import("../../entities/button.entity").Button[]>;
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
    findOne(id: string): Promise<import("../../entities/button.entity").Button>;
    create(createButtonDto: CreateButtonDto): Promise<import("../../entities/button.entity").Button>;
    update(id: string, updateButtonDto: UpdateButtonDto): Promise<import("../../entities/button.entity").Button>;
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
