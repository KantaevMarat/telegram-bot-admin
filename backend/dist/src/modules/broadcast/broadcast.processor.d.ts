import { WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { BroadcastService } from './broadcast.service';
export declare class BroadcastProcessor extends WorkerHost {
    private configService;
    private broadcastService;
    private readonly logger;
    private botToken;
    constructor(configService: ConfigService, broadcastService: BroadcastService);
    process(job: Job<any>): Promise<any>;
    private sendMessage;
    private sendMedia;
}
