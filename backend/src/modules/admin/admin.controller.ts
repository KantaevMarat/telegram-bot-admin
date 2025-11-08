import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Logger, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@ApiTags('admin')
@Controller('admin/admins')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get all admins' })
  async findAll(@Req() req: any) {
    this.logger.log(`📥 GET /admin/admins - Request from ${req.ip || 'unknown'}`);
    this.logger.debug(`Headers: ${JSON.stringify(req.headers)}`);
    try {
      const result = await this.adminService.findAll();
      this.logger.log(`✅ GET /admin/admins - Success, returning ${Array.isArray(result) ? result.length : 'unknown'} admins`);
      return result;
    } catch (error) {
      this.logger.error(`❌ GET /admin/admins - Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get admin by ID' })
  async findOne(@Param('id') id: string) {
    return await this.adminService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Add new admin' })
  async create(@Body() createAdminDto: CreateAdminDto) {
    return await this.adminService.create(createAdminDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update admin' })
  async update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
    return await this.adminService.update(id, updateAdminDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove admin' })
  async remove(@Param('id') id: string) {
    return await this.adminService.remove(id);
  }
}
