import { BotService } from './bot.service';
export declare class BotController {
    private readonly botService;
    constructor(botService: BotService);
    webhook(update: any): Promise<{
        ok: boolean;
    }>;
    setWebhook(body: {
        url: string;
    }): Promise<any>;
    deleteWebhook(body: {
        drop_pending_updates?: boolean;
    }): Promise<any>;
}
