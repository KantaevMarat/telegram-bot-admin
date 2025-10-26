import { WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
export declare class BroadcastProcessor extends WorkerHost {
    private configService;
    private readonly logger;
    private botToken;
    constructor(configService: ConfigService);
    process(job: Job<any>): Promise<any>;
    private sendMessage;
    private sendMedia;
}
