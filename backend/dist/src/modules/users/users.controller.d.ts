import { UsersService } from './users.service';
import { UpdateBalanceDto } from './dto/update-balance.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(page?: number, limit?: number, search?: string, status?: string): Promise<{
        data: import("../../entities/user.entity").User[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: string): Promise<import("../../entities/user.entity").User>;
    updateBalance(tgId: string, dto: UpdateBalanceDto): Promise<import("../../entities/user.entity").User>;
    blockUser(id: string): Promise<import("../../entities/user.entity").User>;
    unblockUser(id: string): Promise<import("../../entities/user.entity").User>;
    getBalanceLogs(id: string, limit?: number): Promise<import("../../entities/balance-log.entity").BalanceLog[]>;
}
