import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from '../../entities/settings.entity';
import { SettingsHistory } from '../../entities/settings-history.entity';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { DEFAULT_SETTINGS, getDefaultSettingsByCategory } from '../../database/default-settings';
import { SyncService } from '../sync/sync.service';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Settings)
    private settingsRepository: Repository<Settings>,
    @InjectRepository(SettingsHistory)
    private settingsHistoryRepository: Repository<SettingsHistory>,
    private syncService: SyncService,
  ) {}

  async findAll(): Promise<Settings[]> {
    return await this.settingsRepository.find({ order: { key: 'ASC' } });
  }

  async findOne(key: string): Promise<Settings | null> {
    return await this.settingsRepository.findOne({ where: { key } });
  }

  async upsert(
    key: string,
    value: string,
    adminTgId?: string,
    adminUsername?: string,
    adminFirstName?: string,
    changeReason?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Settings> {
    let setting = await this.settingsRepository.findOne({ where: { key } });
    const oldValue = setting?.value;

    if (setting) {
      setting.value = value;
      if (adminTgId) setting.updated_by_admin_tg_id = adminTgId;
    } else {
      setting = this.settingsRepository.create({
        key,
        value,
        updated_by_admin_tg_id: adminTgId,
      });
    }

    const savedSetting = await this.settingsRepository.save(setting!);

    // Record history if value changed
    if (oldValue !== value) {
      await this.recordHistory(
        key,
        oldValue,
        value,
        changeReason,
        adminTgId,
        adminUsername,
        adminFirstName,
        ipAddress,
        userAgent,
      );
      
      // Emit sync event
      await this.syncService.emitEntityEvent('settings', 'updated', {
        key,
        value,
        oldValue,
      });
    }

    return savedSetting;
  }

  async updateOne(
    key: string,
    value: string,
    adminTgId: string,
    adminUsername?: string,
    adminFirstName?: string,
    changeReason?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Settings> {
    const setting = await this.findOne(key);
    if (!setting) {
      throw new NotFoundException(`Setting with key '${key}' not found`);
    }

    const oldValue = setting.value;
    setting.value = value;
    setting.updated_by_admin_tg_id = adminTgId;
    const updated = await this.settingsRepository.save(setting);

    // Record history if value changed
    if (oldValue !== value) {
      await this.recordHistory(
        key,
        oldValue,
        value,
        changeReason,
        adminTgId,
        adminUsername,
        adminFirstName,
        ipAddress,
        userAgent,
      );
    }

    return updated;
  }

  async updateAll(
    settings: UpdateSettingDto[],
    adminTgId: string,
    adminUsername?: string,
    adminFirstName?: string,
    changeReason?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Settings[]> {
    const updatedSettings: Settings[] = [];
    for (const dto of settings) {
      const setting = await this.findOne(dto.key);
      if (setting) {
        const oldValue = setting.value;
        setting.value = dto.value;
        setting.updated_by_admin_tg_id = adminTgId;
        const updated = await this.settingsRepository.save(setting);

        // Record history if value changed
        if (oldValue !== dto.value) {
          await this.recordHistory(
            dto.key,
            oldValue,
            dto.value,
            changeReason,
            adminTgId,
            adminUsername,
            adminFirstName,
            ipAddress,
            userAgent,
          );
        }

        updatedSettings.push(updated);
      }
    }
    return updatedSettings;
  }

  async getValue(key: string, defaultValue: string = ''): Promise<string> {
    const setting = await this.settingsRepository.findOne({ where: { key } });
    return setting?.value || defaultValue;
  }

  async remove(key: string) {
    const setting = await this.settingsRepository.findOne({ where: { key } });
    if (setting) {
      await this.settingsRepository.remove(setting);
    }
    return { success: true };
  }

  async getSettingsByCategories() {
    const settings = await this.findAll();
    const categories = this.groupSettingsByCategory(settings);
    return categories;
  }

  async getSettingsByCategory(category: string) {
    const settings = await this.findAll();
    return settings.filter((setting) => this.getSettingCategory(setting.key) === category);
  }

  async validateSettings(settings: UpdateSettingDto[]) {
    const validationResults: any[] = [];

    for (const setting of settings) {
      const result = {
        key: setting.key,
        valid: true,
        errors: [] as string[],
      };

      // Validate based on setting type
      if (
        setting.key.includes('enabled') ||
        setting.key.includes('_mode') ||
        setting.key.startsWith('registration_') ||
        setting.key.startsWith('log_') ||
        setting.key.startsWith('alert_') ||
        setting.key.startsWith('monitoring_') ||
        setting.key.startsWith('performance_') ||
        setting.key.startsWith('auto_') ||
        setting.key.startsWith('anti_') ||
        setting.key.startsWith('username_filter_') ||
        setting.key.startsWith('rate_limiting_') ||
        setting.key.startsWith('two_factor_') ||
        setting.key.startsWith('suspicious_')
      ) {
        if (!['true', 'false'].includes(setting.value)) {
          result.valid = false;
          result.errors.push('Должно быть true или false');
        }
      }

      if (
        setting.key.includes('timeout') ||
        setting.key.includes('cooldown') ||
        setting.key.includes('interval') ||
        setting.key.includes('_sec') ||
        setting.key.includes('_hours') ||
        setting.key.includes('limit') ||
        setting.key.includes('min_') ||
        setting.key.includes('max_') ||
        setting.key.includes('_per_')
      ) {
        const numValue = parseFloat(setting.value);
        if (isNaN(numValue) || numValue < 0) {
          result.valid = false;
          result.errors.push('Должно быть положительным числом');
        }
      }

      if (setting.key.includes('fee_percent')) {
        const percentValue = parseFloat(setting.value);
        if (isNaN(percentValue) || percentValue < 0 || percentValue > 100) {
          result.valid = false;
          result.errors.push('Должно быть от 0 до 100');
        }
      }

      validationResults.push(result);
    }

    return {
      valid: validationResults.every((r) => r.valid),
      results: validationResults,
    };
  }

  async exportSettings() {
    const settings = await this.findAll();
    return {
      exportDate: new Date().toISOString(),
      totalSettings: settings.length,
      settings: settings.map((s) => ({
        key: s.key,
        value: s.value,
        description: s.description,
      })),
    };
  }

  async importSettings(
    settings: any[],
    adminTgId: string,
    adminUsername?: string,
    adminFirstName?: string,
    changeReason?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const results: any[] = [];

    for (const setting of settings) {
      try {
        await this.upsert(
          setting.key,
          setting.value,
          adminTgId,
          adminUsername,
          adminFirstName,
          changeReason,
          ipAddress,
          userAgent,
        );
        results.push({ key: setting.key, success: true });
      } catch (error: any) {
        results.push({ key: setting.key, success: false, error: error.message });
      }
    }

    return {
      total: settings.length,
      successful: results.filter((r: any) => r.success).length,
      failed: results.filter((r: any) => !r.success).length,
      results,
    };
  }

  async resetSettings(
    categories?: string[],
    adminTgId?: string,
    adminUsername?: string,
    adminFirstName?: string,
    changeReason?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Get default settings, filtered by categories if specified
    let defaultSettings = DEFAULT_SETTINGS;

    if (categories && categories.length > 0) {
      defaultSettings = [];
      for (const category of categories) {
        defaultSettings.push(...getDefaultSettingsByCategory(category));
      }
    }

    // Reset each setting to its default value
    const resetResults: { key: string; oldValue: string; newValue: string; reset: boolean }[] = [];
    let successCount = 0;
    let skippedCount = 0;

    for (const defaultSetting of defaultSettings) {
      try {
        const currentSetting = await this.settingsRepository.findOne({
          where: { key: defaultSetting.key },
        });

        const oldValue = currentSetting?.value || '';
        const newValue = defaultSetting.value;

        // Only reset if value is different
        if (oldValue !== newValue) {
          await this.upsert(
            defaultSetting.key,
            newValue,
            adminTgId,
            adminUsername,
            adminFirstName,
            changeReason || 'Reset to default value',
            ipAddress,
            userAgent,
          );

          resetResults.push({
            key: defaultSetting.key,
            oldValue,
            newValue,
            reset: true,
          });
          successCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`Failed to reset setting ${defaultSetting.key}:`, error);
        resetResults.push({
          key: defaultSetting.key,
          oldValue: '',
          newValue: defaultSetting.value,
          reset: false,
        });
      }
    }

    return {
      success: true,
      message: `Reset ${successCount} settings to default values`,
      totalSettings: defaultSettings.length,
      resetCount: successCount,
      skippedCount: skippedCount,
      failedCount: resetResults.filter((r) => !r.reset && r.oldValue === '').length,
      categories: categories && categories.length > 0 ? categories : ['all'],
      resetBy: adminTgId,
      adminUsername,
      adminFirstName,
      timestamp: new Date().toISOString(),
      details: resetResults.filter((r) => r.reset), // Only include actually reset settings
    };
  }

  async getSettingsHistory(limit: number = 50, offset: number = 0) {
    const [changes, total] = await this.settingsHistoryRepository.findAndCount({
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      total,
      limit,
      offset,
      changes,
    };
  }

  async searchSettings(query: string, category?: string) {
    const settings = await this.findAll();
    let filteredSettings = settings;

    if (category) {
      filteredSettings = filteredSettings.filter(
        (setting) => this.getSettingCategory(setting.key) === category,
      );
    }

    filteredSettings = filteredSettings.filter(
      (setting) =>
        setting.key.toLowerCase().includes(query.toLowerCase()) ||
        setting.description.toLowerCase().includes(query.toLowerCase()) ||
        setting.value.toLowerCase().includes(query.toLowerCase()),
    );

    return filteredSettings;
  }

  async bulkUpdateSettings(
    settings: UpdateSettingDto[],
    adminTgId: string,
    adminUsername?: string,
    adminFirstName?: string,
    changeReason?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // First validate all settings
    const validation = await this.validateSettings(settings);

    if (!validation.valid) {
      return {
        success: false,
        errors: validation.results.filter((r: any) => !r.valid),
      };
    }

    // If validation passes, update all settings
    const updatedSettings: Settings[] = [];
    for (const setting of settings) {
      const updated = await this.upsert(
        setting.key,
        setting.value,
        adminTgId,
        adminUsername,
        adminFirstName,
        changeReason,
        ipAddress,
        userAgent,
      );
      updatedSettings.push(updated);
    }

    return {
      success: true,
      updated: updatedSettings.length,
      settings: updatedSettings,
    };
  }

  private getSettingCategory(key: string): string {
    if (
      key.startsWith('bot_') ||
      key.startsWith('webhook_') ||
      key.startsWith('max_users_') ||
      key.startsWith('max_messages_') ||
      key.startsWith('anti_spam_') ||
      key.startsWith('auto_reply_') ||
      key.startsWith('maintenance_') ||
      key.startsWith('registration_')
    ) {
      return 'bot';
    }
    if (
      key.startsWith('min_user_') ||
      key.startsWith('max_username_') ||
      key.startsWith('username_filter_') ||
      key.startsWith('banned_') ||
      key.startsWith('auto_ban_') ||
      key.startsWith('user_session_')
    ) {
      return 'users';
    }
    if (
      key.startsWith('min_deposit') ||
      key.startsWith('max_deposit') ||
      key.startsWith('min_withdraw') ||
      key.startsWith('max_withdraw') ||
      key.startsWith('daily_withdraw_') ||
      key.startsWith('weekly_withdraw_') ||
      key.startsWith('monthly_withdraw_') ||
      key.startsWith('withdraw_fee_') ||
      key.startsWith('ref_bonus') ||
      key.startsWith('currency') ||
      key.startsWith('payment_')
    ) {
      return 'financial';
    }
    if (
      key.startsWith('two_factor_') ||
      key.startsWith('password_') ||
      key.startsWith('login_') ||
      key.startsWith('suspicious_') ||
      key.startsWith('ip_') ||
      key.startsWith('rate_limiting_') ||
      key.startsWith('requests_per_')
    ) {
      return 'security';
    }
    if (
      key.startsWith('log_') ||
      key.startsWith('alert_') ||
      key.startsWith('monitoring_') ||
      key.startsWith('performance_')
    ) {
      return 'monitoring';
    }
    if (
      key.startsWith('welcome_') ||
      key.startsWith('help_') ||
      key.startsWith('support_') ||
      key.startsWith('greeting_') ||
      key.startsWith('language') ||
      key.startsWith('timezone') ||
      key.startsWith('date_format')
    ) {
      return 'content';
    }
    if (
      key.startsWith('api_rate_') ||
      key.startsWith('backup_') ||
      key.startsWith('notification_service') ||
      key.startsWith('analytics_')
    ) {
      return 'integrations';
    }
    if (
      key.startsWith('fake_') ||
      key.startsWith('task_') ||
      key.startsWith('work_') ||
      key.startsWith('min_reward') ||
      key.startsWith('max_reward') ||
      key.startsWith('task_completion_') ||
      key.startsWith('daily_task_') ||
      key.startsWith('task_timeout') ||
      key.startsWith('auto_create_')
    ) {
      return 'fake';
    }
    return 'bot'; // default
  }

  private groupSettingsByCategory(settings: any[]) {
    const categories = {
      bot: { name: 'Управление ботом', icon: '🤖', settings: [] },
      users: { name: 'Пользователи', icon: '👥', settings: [] },
      financial: { name: 'Финансы', icon: '💰', settings: [] },
      security: { name: 'Безопасность', icon: '🛡️', settings: [] },
      monitoring: { name: 'Мониторинг', icon: '📊', settings: [] },
      content: { name: 'Контент', icon: '📝', settings: [] },
      integrations: { name: 'Интеграции', icon: '🔗', settings: [] },
      fake: { name: 'Фейковые данные', icon: '🎭', settings: [] },
    };

    settings.forEach((setting) => {
      const category = this.getSettingCategory(setting.key);
      if (categories[category]) {
        categories[category].settings.push(setting);
      }
    });

    return categories;
  }

  private async recordHistory(
    settingKey: string,
    oldValue: string | undefined,
    newValue: string,
    changeReason?: string,
    adminTgId?: string,
    adminUsername?: string,
    adminFirstName?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      const historyEntry = this.settingsHistoryRepository.create({
        setting_key: settingKey,
        old_value: oldValue,
        new_value: newValue,
        change_reason: changeReason,
        admin_tg_id: adminTgId,
        admin_username: adminUsername,
        admin_first_name: adminFirstName,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      await this.settingsHistoryRepository.save(historyEntry);
    } catch (error) {
      console.error('Failed to record settings history:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }
}
