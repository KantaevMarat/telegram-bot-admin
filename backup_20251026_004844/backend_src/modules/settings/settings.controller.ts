import { Controller, Get, Put, Body, UseGuards, Req, Param, Delete, Post, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UpdateSettingDto } from './dto/update-setting.dto';

@ApiTags('admin')
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings' })
  async findAll() {
    return await this.settingsService.findAll();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a specific setting by key' })
  async findOne(@Param('key') key: string) {
    return await this.settingsService.findOne(key);
  }

  @Put(':key')
  @ApiOperation({ summary: 'Update a single setting by key' })
  async updateOne(@Param('key') key: string, @Body() body: { value: string }, @Req() req, @Headers() headers) {
    const adminTgId = req.user.tg_id;
    const adminUsername = req.user.username;
    const adminFirstName = req.user.first_name;
    const ipAddress = headers['x-forwarded-for'] || headers['x-real-ip'] || req.connection.remoteAddress;
    const userAgent = headers['user-agent'];

    return await this.settingsService.updateOne(
      key,
      body.value,
      adminTgId,
      adminUsername,
      adminFirstName,
      'Single setting update',
      ipAddress,
      userAgent
    );
  }

  @Put()
  @ApiOperation({ summary: 'Update multiple settings' })
  async updateAll(@Body() body: { settings: UpdateSettingDto[] }, @Req() req, @Headers() headers) {
    const adminTgId = req.user.tg_id;
    const adminUsername = req.user.username;
    const adminFirstName = req.user.first_name;
    const ipAddress = headers['x-forwarded-for'] || headers['x-real-ip'] || req.connection.remoteAddress;
    const userAgent = headers['user-agent'];
    const changeReason = body.settings.length > 1 ? 'Bulk update' : 'Single setting update';

    return await this.settingsService.updateAll(
      body.settings,
      adminTgId,
      adminUsername,
      adminFirstName,
      changeReason,
      ipAddress,
      userAgent
    );
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a setting' })
  async remove(@Param('key') key: string) {
    return await this.settingsService.remove(key);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get settings grouped by categories' })
  async getSettingsByCategories() {
    return await this.settingsService.getSettingsByCategories();
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get settings by category' })
  async getSettingsByCategory(@Param('category') category: string) {
    return await this.settingsService.getSettingsByCategory(category);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate settings' })
  async validateSettings(@Body() body: { settings: UpdateSettingDto[] }) {
    return await this.settingsService.validateSettings(body.settings);
  }

  @Post('export')
  @ApiOperation({ summary: 'Export all settings' })
  async exportSettings() {
    return await this.settingsService.exportSettings();
  }

  @Post('import')
  @ApiOperation({ summary: 'Import settings' })
  async importSettings(@Body() body: { settings: any[] }, @Req() req, @Headers() headers) {
    const adminTgId = req.user.tg_id;
    const adminUsername = req.user.username;
    const adminFirstName = req.user.first_name;
    const ipAddress = headers['x-forwarded-for'] || headers['x-real-ip'] || req.connection.remoteAddress;
    const userAgent = headers['user-agent'];

    return await this.settingsService.importSettings(body.settings, adminTgId, adminUsername, adminFirstName, 'Settings import', ipAddress, userAgent);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset settings to defaults' })
  async resetSettings(@Body() body: { categories?: string[] }, @Req() req, @Headers() headers) {
    const adminTgId = req.user.tg_id;
    const adminUsername = req.user.username;
    const adminFirstName = req.user.first_name;
    const ipAddress = headers['x-forwarded-for'] || headers['x-real-ip'] || req.connection.remoteAddress;
    const userAgent = headers['user-agent'];

    return await this.settingsService.resetSettings(body.categories, adminTgId, adminUsername, adminFirstName, 'Settings reset', ipAddress, userAgent);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get settings change history' })
  async getSettingsHistory(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return await this.settingsService.getSettingsHistory(
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search settings' })
  async searchSettings(@Query('q') query: string, @Query('category') category?: string) {
    return await this.settingsService.searchSettings(query, category);
  }

  @Post('bulk-update')
  @ApiOperation({ summary: 'Bulk update settings with validation' })
  async bulkUpdateSettings(@Body() body: { settings: UpdateSettingDto[] }, @Req() req, @Headers() headers) {
    const adminTgId = req.user.tg_id;
    const adminUsername = req.user.username;
    const adminFirstName = req.user.first_name;
    const ipAddress = headers['x-forwarded-for'] || headers['x-real-ip'] || req.connection.remoteAddress;
    const userAgent = headers['user-agent'];

    return await this.settingsService.bulkUpdateSettings(
      body.settings,
      adminTgId,
      adminUsername,
      adminFirstName,
      'Bulk update with validation',
      ipAddress,
      userAgent
    );
  }
}

