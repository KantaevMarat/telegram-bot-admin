"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const admin_entity_1 = require("../../entities/admin.entity");
let AdminService = class AdminService {
    constructor(adminRepo) {
        this.adminRepo = adminRepo;
    }
    async findAll() {
        return await this.adminRepo.find({
            order: { created_at: 'DESC' },
        });
    }
    async findOne(id) {
        const admin = await this.adminRepo.findOne({ where: { id } });
        if (!admin) {
            throw new common_1.NotFoundException('Admin not found');
        }
        return admin;
    }
    async findByTgId(tg_id) {
        return await this.adminRepo.findOne({ where: { tg_id } });
    }
    async create(createAdminDto) {
        const exists = await this.findByTgId(createAdminDto.tg_id);
        if (exists) {
            throw new common_1.BadRequestException('Admin with this Telegram ID already exists');
        }
        const admin = this.adminRepo.create({
            tg_id: createAdminDto.tg_id,
            role: createAdminDto.role || 'admin',
            username: createAdminDto.username,
            first_name: createAdminDto.first_name,
        });
        return await this.adminRepo.save(admin);
    }
    async update(id, updateAdminDto) {
        const admin = await this.findOne(id);
        if (updateAdminDto.role !== undefined) {
            admin.role = updateAdminDto.role;
        }
        if (updateAdminDto.username !== undefined) {
            admin.username = updateAdminDto.username;
        }
        if (updateAdminDto.first_name !== undefined) {
            admin.first_name = updateAdminDto.first_name;
        }
        return await this.adminRepo.save(admin);
    }
    async remove(id) {
        const admin = await this.findOne(id);
        await this.adminRepo.remove(admin);
        return { success: true, message: 'Admin removed' };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(admin_entity_1.Admin)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AdminService);
//# sourceMappingURL=admin.service.js.map