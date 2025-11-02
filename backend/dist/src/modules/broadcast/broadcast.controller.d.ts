import { BroadcastService } from './broadcast.service';
import { BroadcastDto } from './dto/broadcast.dto';
export declare class BroadcastController {
    private readonly broadcastService;
    constructor(broadcastService: BroadcastService);
    createBroadcast(broadcastDto: BroadcastDto): Promise<import("../../entities/broadcast.entity").Broadcast>;
    getAllBroadcasts(): Promise<import("../../entities/broadcast.entity").Broadcast[]>;
    getBroadcast(id: string): Promise<import("../../entities/broadcast.entity").Broadcast | null>;
    deleteBroadcast(id: string): Promise<{
        success: boolean;
    }>;
}
