import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RanksService } from './ranks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SyncService } from '../sync/sync.service';

@ApiTags('admin')
@Controller('admin/ranks')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class RanksController {
  constructor(
    private readonly ranksService: RanksService,
    private readonly syncService: SyncService,
  ) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get rank settings' })
  async getSettings() {
    return await this.ranksService.getSettings();
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update rank settings' })
  async updateSettings(@Body() data: any) {
    const result = await this.ranksService.updateSettings(data);
    // Notify all clients about settings update
    await this.syncService.publish('ranks.settings_updated', result);
    return result;
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get rank statistics' })
  async getStatistics() {
    return await this.ranksService.getRankStatistics();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user rank info' })
  async getUserRank(@Param('userId') userId: string) {
    const rank = await this.ranksService.getUserRank(userId);
    const progress = await this.ranksService.getRankProgress(userId);
    return { rank, progress };
  }

  @Put('user/:userId/check')
  @ApiOperation({ summary: 'Check and update user rank' })
  async checkUserRank(@Param('userId') userId: string) {
    return await this.ranksService.checkAndUpdateRank(userId);
  }
}

