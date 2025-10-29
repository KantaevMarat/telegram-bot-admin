import { Repository } from 'typeorm';
import { Admin } from '../../entities/admin.entity';
export declare class DebugController {
    private adminRepo;
    constructor(adminRepo: Repository<Admin>);
    getAllAdmins(): Promise<{
        count: number;
        admins: {
            id: string;
            tg_id: string;
            tg_id_type: "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function";
            role: string;
            username: string;
        }[];
    }>;
    testFind(): Promise<{
        searchingFor: string;
        foundByString: string;
        foundByNumber: string;
        allAdmins: {
            tg_id: string;
            matches: boolean;
            strictMatches: boolean;
        }[];
    }>;
}
