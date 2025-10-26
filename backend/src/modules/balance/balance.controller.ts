import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BalanceService } from './balance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('admin')
@Controller('admin/balance')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get balance overview' })
  async getOverview() {
    return await this.balanceService.getBalanceOverview();
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get balance change logs' })
  async getLogs(@Query('page') page?: number, @Query('limit') limit?: number) {
    return await this.balanceService.getBalanceLogs(
      page ? parseInt(page.toString()) : 1,
      limit ? parseInt(limit.toString()) : 50,
    );
  }
}
