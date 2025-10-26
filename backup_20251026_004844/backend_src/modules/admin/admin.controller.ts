import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateAdminDto } from './dto/create-admin.dto';

@ApiTags('admin')
@Controller('admin/admins')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get all admins' })
  async findAll() {
    return await this.adminService.findAll();
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

  @Delete(':id')
  @ApiOperation({ summary: 'Remove admin' })
  async remove(@Param('id') id: string) {
    return await this.adminService.remove(id);
  }
}

