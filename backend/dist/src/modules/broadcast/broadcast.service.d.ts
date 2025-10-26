import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { User } from '../../entities/user.entity';
import { BroadcastDto } from './dto/broadcast.dto';
export declare class BroadcastService {
    private userRepo;
    private broadcastQueue;
    constructor(userRepo: Repository<User>, broadcastQueue: Queue);
    sendBroadcast(broadcastDto: BroadcastDto): Promise<{
        success: boolean;
        message: string;
        total_users: number;
        batches: number;
    }>;
}
