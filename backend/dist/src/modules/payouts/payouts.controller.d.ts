import { PayoutsService } from './payouts.service';
import { DeclinePayoutDto } from './dto/decline-payout.dto';
export declare class PayoutsController {
    private readonly payoutsService;
    constructor(payoutsService: PayoutsService);
    findAll(status?: string, page?: number, limit?: number): Promise<{
        data: import("../../entities/payout.entity").Payout[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: string): Promise<import("../../entities/payout.entity").Payout>;
    approve(id: string, req: any): Promise<import("../../entities/payout.entity").Payout>;
    decline(id: string, declineDto: DeclinePayoutDto, req: any): Promise<import("../../entities/payout.entity").Payout>;
}
