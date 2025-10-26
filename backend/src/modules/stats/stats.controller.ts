import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { FakeStatsService } from './fake-stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('admin')
@Controller('admin/stats')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly fakeStatsService: FakeStatsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get combined statistics (real + fake)' })
  async getStats() {
    return await this.statsService.getCombinedStats();
  }

  @Get('real')
  @ApiOperation({ summary: 'Get real statistics only' })
  async getRealStats() {
    return await this.statsService.getRealStats();
  }

  @Get('fake')
  @ApiOperation({ summary: 'Get fake statistics only' })
  async getFakeStats() {
    return await this.fakeStatsService.getLatestFakeStats();
  }

  @Get('history')
  @ApiOperation({ summary: 'Get stats history for charts' })
  async getStatsHistory(@Query('days') days?: number) {
    return await this.statsService.getStatsHistory(days ? parseInt(days.toString()) : 30);
  }

  @Post('fake/regenerate')
  @ApiOperation({ summary: 'Manually regenerate fake statistics' })
  async regenerateFakeStats() {
    const newStats = await this.fakeStatsService.regenerateFakeStats();
    return {
      success: true,
      message: 'Fake statistics regenerated successfully',
      data: newStats,
    };
  }

  @Get('top-users')
  @ApiOperation({ summary: 'Get top users by balance, earned, tasks' })
  async getTopUsers(@Query('limit') limit?: number) {
    return await this.statsService.getTopUsers(limit ? parseInt(limit.toString()) : 10);
  }
}
