import { ConfigService } from '@nestjs/config';
export interface TelegramInitData {
    query_id?: string;
    user?: {
        id: number;
        first_name: string;
        last_name?: string;
        username?: string;
        language_code?: string;
        is_premium?: boolean;
        photo_url?: string;
    };
    receiver?: any;
    chat?: any;
    chat_type?: string;
    chat_instance?: string;
    start_param?: string;
    can_send_after?: number;
    auth_date: number;
    hash: string;
}
export declare class TelegramAuthService {
    private configService;
    private readonly logger;
    private readonly adminBotToken;
    private readonly userBotToken;
    constructor(configService: ConfigService);
    validateInitData(initData: string): TelegramInitData;
    createMockInitData(userId: number, firstName?: string): TelegramInitData;
}
