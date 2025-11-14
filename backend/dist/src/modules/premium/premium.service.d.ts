import { Repository } from 'typeorm';
import { PremiumRequest, PaymentMethod, RequestStatus } from '../../entities/premium-request.entity';
import { User } from '../../entities/user.entity';
import { RanksService } from '../ranks/ranks.service';
import { BalanceLog } from '../../entities/balance-log.entity';
export declare class PremiumService {
    private premiumRequestRepo;
    private userRepo;
    private balanceLogRepo;
    private ranksService;
    private readonly logger;
    constructor(premiumRequestRepo: Repository<PremiumRequest>, userRepo: Repository<User>, balanceLogRepo: Repository<BalanceLog>, ranksService: RanksService);
    createRequest(userId: string, paymentMethod: PaymentMethod): Promise<PremiumRequest>;
    processBalancePayment(userId: string): Promise<{
        success: boolean;
        message: string;
        request?: PremiumRequest;
    }>;
    getAllRequests(status?: RequestStatus, currency?: string): Promise<PremiumRequest[]>;
    markRequisitesSent(requestId: string, adminTgId: string): Promise<PremiumRequest>;
    confirmPayment(requestId: string, adminTgId: string): Promise<PremiumRequest>;
    activateSubscription(requestId: string, adminTgId: string): Promise<{
        request: PremiumRequest;
        message: string;
    }>;
    cancelRequest(requestId: string, reason?: string): Promise<PremiumRequest>;
}
