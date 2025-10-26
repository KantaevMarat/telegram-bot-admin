import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    findAll(): Promise<import("../../entities/admin.entity").Admin[]>;
    findOne(id: string): Promise<import("../../entities/admin.entity").Admin>;
    create(createAdminDto: CreateAdminDto): Promise<import("../../entities/admin.entity").Admin>;
    update(id: string, updateAdminDto: UpdateAdminDto): Promise<import("../../entities/admin.entity").Admin>;
    remove(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
