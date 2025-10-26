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
}
