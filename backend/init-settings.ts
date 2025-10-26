import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { SettingsService } from './src/modules/settings/settings.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const settingsService = app.get(SettingsService);

  // Initialize default settings
  const defaultSettings = [
    {
      key: 'bot_token',
      value: '',
      description: 'Telegram Bot Token'
    },
    {
      key: 'bot_username',
      value: '',
      description: 'Bot Username (without @)'
    },
    {
      key: 'bot_welcome_message',
      value: 'Добро пожаловать! Используйте /start для начала работы.',
      description: 'Welcome message for new users'
    },
    {
      key: 'bot_help_message',
      value: 'Помощь: /start - начать работу, /balance - проверить баланс',
      description: 'Help message for users'
    },
    {
      key: 'user_registration_enabled',
      value: 'true',
      description: 'Enable user registration'
    },
    {
      key: 'user_balance_min',
      value: '0.00',
      description: 'Minimum user balance'
    },
    {
      key: 'user_balance_max',
      value: '10000.00',
      description: 'Maximum user balance'
    },
    {
      key: 'payout_min_amount',
      value: '1.00',
      description: 'Minimum payout amount'
    },
    {
      key: 'payout_max_amount',
      value: '1000.00',
      description: 'Maximum payout amount'
    },
    {
      key: 'payout_fee_percent',
      value: '0.00',
      description: 'Payout fee percentage'
    },
    {
      key: 'task_reward_min',
      value: '0.01',
      description: 'Minimum task reward'
    },
    {
      key: 'task_reward_max',
      value: '100.00',
      description: 'Maximum task reward'
    },
    {
      key: 'system_maintenance_mode',
      value: 'false',
      description: 'System maintenance mode'
    },
    {
      key: 'system_debug_mode',
      value: 'false',
      description: 'System debug mode'
    },
    {
      key: 'notification_email_enabled',
      value: 'false',
      description: 'Enable email notifications'
    },
    {
      key: 'notification_telegram_enabled',
      value: 'true',
      description: 'Enable Telegram notifications'
    },
    {
      key: 'integration_webhook_url',
      value: '',
      description: 'Webhook URL for integrations'
    },
    {
      key: 'integration_api_key',
      value: '',
      description: 'API key for external integrations'
    },
    {
      key: 'database_backup_enabled',
      value: 'true',
      description: 'Enable automatic database backups'
    },
    {
      key: 'database_backup_interval_hours',
      value: '24',
      description: 'Database backup interval in hours'
    }
  ];

  console.log('Initializing default settings...');
  
  for (const setting of defaultSettings) {
    try {
      await settingsService.upsert(
        setting.key,
        setting.value,
        'system',
        'system',
        'System',
        'Initial setup',
        '127.0.0.1',
        'Settings Initializer'
      );
      console.log(`✓ Created setting: ${setting.key}`);
    } catch (error) {
      console.log(`✗ Failed to create setting ${setting.key}:`, error.message);
    }
  }

  console.log('Settings initialization completed!');
  await app.close();
}

bootstrap().catch(console.error);
