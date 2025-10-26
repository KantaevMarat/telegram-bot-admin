import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UpdateBalanceDto } from './dto/update-balance.dto';

@ApiTags('admin')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination and filters' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return await this.usersService.findAll(
      page ? parseInt(page.toString()) : 1,
      limit ? parseInt(limit.toString()) : 20,
      search,
      status,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string) {
    return await this.usersService.findOne(id);
  }

  @Post(':tgId/balance')
  @ApiOperation({ summary: 'Update user balance (add or subtract)' })
  async updateBalance(@Param('tgId') tgId: string, @Body() dto: UpdateBalanceDto) {
    return await this.usersService.updateBalance(
      tgId,
      dto.delta,
      dto.reason,
      dto.adminTgId,
      dto.comment,
    );
  }

  @Post(':id/block')
  @ApiOperation({ summary: 'Block user' })
  async blockUser(@Param('id') id: string) {
    return await this.usersService.blockUser(id);
  }

  @Post(':id/unblock')
  @ApiOperation({ summary: 'Unblock user' })
  async unblockUser(@Param('id') id: string) {
    return await this.usersService.unblockUser(id);
  }

  @Get(':id/balance-logs')
  @ApiOperation({ summary: 'Get user balance history' })
  async getBalanceLogs(@Param('id') id: string, @Query('limit') limit?: number) {
    return await this.usersService.getBalanceLogs(id, limit ? parseInt(limit.toString()) : 50);
  }
}
