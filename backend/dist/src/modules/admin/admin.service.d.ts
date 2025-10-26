import { Repository } from 'typeorm';
import { Admin } from '../../entities/admin.entity';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
export declare class AdminService {
    private adminRepo;
    constructor(adminRepo: Repository<Admin>);
    findAll(): Promise<Admin[]>;
    findOne(id: string): Promise<Admin>;
    findByTgId(tg_id: string): Promise<Admin | null>;
    create(createAdminDto: CreateAdminDto): Promise<Admin>;
    update(id: string, updateAdminDto: UpdateAdminDto): Promise<Admin>;
    remove(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
