import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    private readonly logger;
    constructor(authService: AuthService);
    loginAdmin(loginDto: LoginDto): Promise<{
        access_token: string;
        admin: {
            id: string;
            tg_id: string;
            username: string;
            first_name: string;
            role: string;
        };
    }>;
    loginUser(loginDto: LoginDto): Promise<{
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
    testAdmins(): Promise<{
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
