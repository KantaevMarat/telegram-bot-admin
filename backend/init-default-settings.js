#!/usr/bin/env node
/**
 * Initialize default settings from default-settings.ts
 * This script will add missing settings to the database
 */

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

// Default settings from backend/src/database/default-settings.ts
const DEFAULT_SETTINGS = [
  // Bot Management
  { key: 'bot_token', value: '', description: 'Telegram Bot Token', category: 'bot' },
  { key: 'bot_username', value: '', description: 'Bot Username (without @)', category: 'bot' },
  { key: 'webhook_url', value: '', description: 'Webhook URL for Telegram bot', category: 'bot' },
  { key: 'max_users_per_day', value: '1000', description: 'Maximum new users per day', category: 'bot' },
  { key: 'max_messages_per_hour', value: '30', description: 'Maximum messages per user per hour', category: 'bot' },
  { key: 'anti_spam_enabled', value: 'true', description: 'Enable anti-spam protection', category: 'bot' },
  { key: 'auto_reply_enabled', value: 'false', description: 'Enable automatic replies', category: 'bot' },
  { key: 'maintenance_mode', value: 'false', description: 'Maintenance mode (blocks all users)', category: 'bot' },
  { key: 'registration_enabled', value: 'true', description: 'Allow new user registration', category: 'bot' },

  // Financial Settings
  { key: 'min_deposit_usdt', value: '1.00', description: 'Minimum deposit amount in USDT', category: 'financial' },
  { key: 'max_deposit_usdt', value: '10000.00', description: 'Maximum deposit amount in USDT', category: 'financial' },
  { key: 'min_withdraw_usdt', value: '10.00', description: 'Minimum withdrawal amount in USDT', category: 'financial' },
  { key: 'max_withdraw_usdt', value: '5000.00', description: 'Maximum withdrawal amount in USDT', category: 'financial' },
  { key: 'daily_withdraw_limit_usdt', value: '10000.00', description: 'Daily withdrawal limit in USDT', category: 'financial' },
  { key: 'weekly_withdraw_limit_usdt', value: '50000.00', description: 'Weekly withdrawal limit in USDT', category: 'financial' },
  { key: 'monthly_withdraw_limit_usdt', value: '200000.00', description: 'Monthly withdrawal limit in USDT', category: 'financial' },
  { key: 'withdraw_fee_percent', value: '0.00', description: 'Withdrawal fee percentage', category: 'financial' },
  { key: 'ref_bonus_percent', value: '5.00', description: 'Referral bonus percentage', category: 'financial' },
  { key: 'currency_code', value: 'USDT', description: 'Currency code', category: 'financial' },

  // User Management
  { key: 'min_user_age_days', value: '0', description: 'Minimum Telegram account age in days', category: 'users' },
  { key: 'max_username_length', value: '32', description: 'Maximum username length', category: 'users' },
  { key: 'username_filter_enabled', value: 'false', description: 'Enable username filtering', category: 'users' },
  { key: 'banned_keywords', value: 'spam,scam,hack', description: 'Comma-separated banned keywords', category: 'users' },
  { key: 'auto_ban_enabled', value: 'false', description: 'Automatically ban suspicious users', category: 'users' },
  { key: 'user_session_timeout_hours', value: '24', description: 'User session timeout in hours', category: 'users' },

  // Messages
  { key: 'greeting_template', value: '👋 Добро пожаловать, {username}!\n\n💰 Ваш баланс: {balance} USDT\n📊 Всего заработано: {tasks_completed} заданий\n\n🎯 Выполняйте задания и зарабатывайте!\n👥 Приглашайте друзей по реферальной ссылке\n💸 Выводите заработанные средства\n\n📈 Сейчас онлайн: {fake.online} чел.\n✅ Активных пользователей: {fake.active}\n💵 Выплачено всего: ${fake.paid} USDT', description: 'Greeting message template', category: 'notifications' },
  { key: 'web_app_url', value: 'https://your-app-url.com', description: 'Web App URL for mini app', category: 'integration' },
];

async function initializeSettings() {
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    let addedCount = 0;
    let existingCount = 0;

    for (const setting of DEFAULT_SETTINGS) {
      // Check if setting already exists
      const result = await client.query(
        'SELECT key FROM settings WHERE key = $1',
        [setting.key]
      );

      if (result.rows.length === 0) {
        // Setting doesn't exist, add it
        await client.query(
          'INSERT INTO settings (key, value, description, category) VALUES ($1, $2, $3, $4)',
          [setting.key, setting.value, setting.description, setting.category]
        );
        console.log(`✅ Added setting: ${setting.key}`);
        addedCount++;
      } else {
        console.log(`⏭️  Setting already exists: ${setting.key}`);
        existingCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Added: ${addedCount}`);
    console.log(`  ⏭️  Existing: ${existingCount}`);
    console.log(`  📝 Total: ${DEFAULT_SETTINGS.length}`);

  } catch (error) {
    console.error('❌ Error initializing settings:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

initializeSettings().catch((error) => {
  console.error('Failed to initialize settings:', error);
  process.exit(1);
});





