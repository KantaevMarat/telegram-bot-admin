import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../../entities/admin.entity';

@Controller('debug')
export class DebugController {
  constructor(
    @InjectRepository(Admin)
    private adminRepo: Repository<Admin>,
  ) {}

  @Get('admins')
  async getAllAdmins() {
    const admins = await this.adminRepo.find();
    return {
      count: admins.length,
      admins: admins.map(a => ({
        id: a.id,
        tg_id: a.tg_id,
        tg_id_type: typeof a.tg_id,
        role: a.role,
        username: a.username,
      })),
    };
  }

  @Get('test-find')
  async testFind() {
    const searchTgId = '697184435';
    
    // Try different ways to find
    const byString = await this.adminRepo.findOne({
      where: { tg_id: searchTgId },
    });
    
    const byNumber = await this.adminRepo.findOne({
      where: { tg_id: 697184435 as any },
    });
    
    const all = await this.adminRepo.find();
    
    return {
      searchingFor: searchTgId,
      foundByString: byString ? 'YES' : 'NO',
      foundByNumber: byNumber ? 'YES' : 'NO',
      allAdmins: all.map(a => ({
        tg_id: a.tg_id,
        matches: a.tg_id === searchTgId,
        strictMatches: a.tg_id === searchTgId,
      })),
    };
  }
}

