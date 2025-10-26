import { BroadcastService } from './broadcast.service';
import { BroadcastDto } from './dto/broadcast.dto';
export declare class BroadcastController {
    private readonly broadcastService;
    constructor(broadcastService: BroadcastService);
    broadcast(broadcastDto: BroadcastDto): Promise<{
        success: boolean;
        message: string;
        total_users: number;
        batches: number;
    }>;
}
