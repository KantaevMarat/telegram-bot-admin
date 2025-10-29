import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Admin } from '../../entities/admin.entity';
import { User } from '../../entities/user.entity';
export declare class AuthService {
    private adminRepo;
    private userRepo;
    private jwtService;
    private configService;
    private readonly logger;
    constructor(adminRepo: Repository<Admin>, userRepo: Repository<User>, jwtService: JwtService, configService: ConfigService);
    validateTelegramWebAppData(initData: string): any;
    loginAdmin(initData: string): Promise<{
        access_token: string;
        admin: {
            id: string;
            tg_id: string;
            username: string;
            first_name: string;
            role: string;
        };
    }>;
    loginUser(initData: string): Promise<{
        access_token: string;
        user: {
            id: string;
            tg_id: string;
            username: string;
            first_name: string;
            balance_usdt: number;
            tasks_completed: number;
        };
    }>;
    validateAdmin(tg_id: string): Promise<Admin>;
    validateUser(tg_id: string): Promise<User>;
    devLogin(adminId: number): Promise<{
        access_token: string;
        admin: {
            id: string;
            tg_id: string;
            username: string;
            first_name: string;
            role: string;
        };
    }>;
    debugAdminLookup(): Promise<{
        totalAdmins: number;
        searchingFor: string;
        searchingForType: "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function";
        foundByString: string;
        allAdminsInDb: {
            id: string;
            tg_id: string;
            tg_id_type: "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function";
            role: string;
            username: string;
            matchesSearch: boolean;
            toStringMatches: boolean;
        }[];
    }>;
}
