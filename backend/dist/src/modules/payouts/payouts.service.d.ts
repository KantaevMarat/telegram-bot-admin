import { Repository } from 'typeorm';
import { Payout } from '../../entities/payout.entity';
import { UsersService } from '../users/users.service';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { DeclinePayoutDto } from './dto/decline-payout.dto';
export declare class PayoutsService {
    private payoutRepo;
    private usersService;
    constructor(payoutRepo: Repository<Payout>, usersService: UsersService);
    create(userId: string, createPayoutDto: CreatePayoutDto): Promise<Payout>;
    findAll(status?: string, page?: number, limit?: number): Promise<{
        data: Payout[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: string): Promise<Payout>;
    approve(id: string, adminTgId: string): Promise<Payout>;
    decline(id: string, adminTgId: string, declineDto: DeclinePayoutDto): Promise<Payout>;
}
