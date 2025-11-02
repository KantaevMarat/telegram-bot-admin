import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { User } from '../../entities/user.entity';
import { Broadcast } from '../../entities/broadcast.entity';
import { BroadcastDto } from './dto/broadcast.dto';
export declare class BroadcastService {
    private userRepo;
    private broadcastRepo;
    private broadcastQueue;
    private readonly logger;
    constructor(userRepo: Repository<User>, broadcastRepo: Repository<Broadcast>, broadcastQueue: Queue);
    createBroadcast(broadcastDto: BroadcastDto): Promise<Broadcast>;
    getAllBroadcasts(): Promise<Broadcast[]>;
    getBroadcastById(id: string): Promise<Broadcast | null>;
    deleteBroadcast(id: string): Promise<{
        success: boolean;
    }>;
    executeBroadcast(broadcastId: string): Promise<{
        success: boolean;
        message: string;
        total_users: number;
        batches: number;
    }>;
    updateBroadcastProgress(broadcastId: string, sent: number, failed: number): Promise<void>;
    checkScheduledBroadcasts(): Promise<void>;
    sendBroadcast(broadcastDto: BroadcastDto): Promise<Broadcast>;
}
