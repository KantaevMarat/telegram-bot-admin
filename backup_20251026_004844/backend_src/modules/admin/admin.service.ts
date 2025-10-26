import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../../entities/admin.entity';
import { CreateAdminDto } from './dto/create-admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private adminRepo: Repository<Admin>,
  ) {}

  async findAll() {
    return await this.adminRepo.find({
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string) {
    const admin = await this.adminRepo.findOne({ where: { id } });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    return admin;
  }

  async findByTgId(tg_id: string) {
    return await this.adminRepo.findOne({ where: { tg_id } });
  }

  async create(createAdminDto: CreateAdminDto) {
    const exists = await this.findByTgId(createAdminDto.tg_id);
    if (exists) {
      throw new BadRequestException('Admin with this Telegram ID already exists');
    }

    const admin = this.adminRepo.create({
      tg_id: createAdminDto.tg_id,
      role: createAdminDto.role || 'admin',
      username: createAdminDto.username,
      first_name: createAdminDto.first_name,
    });

    return await this.adminRepo.save(admin);
  }

  async remove(id: string) {
    const admin = await this.findOne(id);
    await this.adminRepo.remove(admin);
    return { success: true, message: 'Admin removed' };
  }
}

