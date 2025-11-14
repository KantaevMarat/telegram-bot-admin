import { PremiumService } from './premium.service';
export declare class PremiumController {
    private readonly premiumService;
    constructor(premiumService: PremiumService);
    getAllRequests(status?: string, currency?: string): Promise<import("../../entities/premium-request.entity").PremiumRequest[]>;
    markRequisitesSent(id: string, req: any): Promise<import("../../entities/premium-request.entity").PremiumRequest>;
    confirmPayment(id: string, req: any): Promise<import("../../entities/premium-request.entity").PremiumRequest>;
    activateSubscription(id: string, req: any): Promise<{
        request: import("../../entities/premium-request.entity").PremiumRequest;
        message: string;
    }>;
    cancelRequest(id: string, reason?: string): Promise<import("../../entities/premium-request.entity").PremiumRequest>;
}
