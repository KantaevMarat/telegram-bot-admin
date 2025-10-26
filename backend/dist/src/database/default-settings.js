"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SETTINGS = void 0;
exports.getDefaultSettingsMap = getDefaultSettingsMap;
exports.getDefaultValue = getDefaultValue;
exports.getDefaultSettingsByCategory = getDefaultSettingsByCategory;
exports.DEFAULT_SETTINGS = [
    { key: 'bot_token', value: '', description: 'Telegram Bot Token', category: 'bot' },
    { key: 'bot_username', value: '', description: 'Bot Username (without @)', category: 'bot' },
    { key: 'webhook_url', value: '', description: 'Webhook URL for Telegram bot', category: 'bot' },
    {
        key: 'max_users_per_day',
        value: '1000',
        description: 'Maximum new users per day',
        category: 'bot',
    },
    {
        key: 'max_messages_per_hour',
        value: '30',
        description: 'Maximum messages per user per hour',
        category: 'bot',
    },
    {
        key: 'anti_spam_enabled',
        value: 'true',
        description: 'Enable anti-spam protection',
        category: 'bot',
    },
    {
        key: 'auto_reply_enabled',
        value: 'false',
        description: 'Enable automatic replies',
        category: 'bot',
    },
    {
        key: 'maintenance_mode',
        value: 'false',
        description: 'Maintenance mode (blocks all users)',
        category: 'bot',
    },
    {
        key: 'registration_enabled',
        value: 'true',
        description: 'Allow new user registration',
        category: 'bot',
    },
    {
        key: 'min_user_age_days',
        value: '0',
        description: 'Minimum Telegram account age in days',
        category: 'users',
    },
    {
        key: 'max_username_length',
        value: '32',
        description: 'Maximum username length',
        category: 'users',
    },
    {
        key: 'username_filter_enabled',
        value: 'false',
        description: 'Enable username filtering',
        category: 'users',
    },
    {
        key: 'banned_keywords',
        value: 'spam,scam,hack',
        description: 'Comma-separated banned keywords',
        category: 'users',
    },
    {
        key: 'auto_ban_enabled',
        value: 'false',
        description: 'Automatically ban suspicious users',
        category: 'users',
    },
    {
        key: 'user_session_timeout_hours',
        value: '24',
        description: 'User session timeout in hours',
        category: 'users',
    },
    {
        key: 'min_deposit_usdt',
        value: '1.00',
        description: 'Minimum deposit amount in USDT',
        category: 'financial',
    },
    {
        key: 'max_deposit_usdt',
        value: '10000.00',
        description: 'Maximum deposit amount in USDT',
        category: 'financial',
    },
    {
        key: 'min_withdraw_usdt',
        value: '10.00',
        description: 'Minimum withdrawal amount in USDT',
        category: 'financial',
    },
    {
        key: 'max_withdraw_usdt',
        value: '5000.00',
        description: 'Maximum withdrawal amount in USDT',
        category: 'financial',
    },
    {
        key: 'daily_withdraw_limit_usdt',
        value: '10000.00',
        description: 'Daily withdrawal limit in USDT',
        category: 'financial',
    },
    {
        key: 'weekly_withdraw_limit_usdt',
        value: '50000.00',
        description: 'Weekly withdrawal limit in USDT',
        category: 'financial',
    },
    {
        key: 'monthly_withdraw_limit_usdt',
        value: '200000.00',
        description: 'Monthly withdrawal limit in USDT',
        category: 'financial',
    },
    {
        key: 'withdraw_fee_percent',
        value: '0.00',
        description: 'Withdrawal fee percentage',
        category: 'financial',
    },
    {
        key: 'ref_bonus_percent',
        value: '5.00',
        description: 'Referral bonus percentage',
        category: 'financial',
    },
    {
        key: 'currency_code',
        value: 'USDT',
        description: 'Primary currency code',
        category: 'financial',
    },
    {
        key: 'payment_methods',
        value: 'trc20,erc20',
        description: 'Available payment methods',
        category: 'financial',
    },
    {
        key: 'two_factor_enabled',
        value: 'false',
        description: 'Enable two-factor authentication',
        category: 'security',
    },
    {
        key: 'password_min_length',
        value: '8',
        description: 'Minimum password length',
        category: 'security',
    },
    {
        key: 'login_attempts_limit',
        value: '5',
        description: 'Maximum login attempts before lockout',
        category: 'security',
    },
    {
        key: 'suspicious_activity_detection',
        value: 'true',
        description: 'Detect suspicious activity',
        category: 'security',
    },
    {
        key: 'ip_whitelist',
        value: '',
        description: 'IP whitelist (comma-separated)',
        category: 'security',
    },
    {
        key: 'rate_limiting_enabled',
        value: 'true',
        description: 'Enable rate limiting',
        category: 'security',
    },
    {
        key: 'requests_per_minute',
        value: '60',
        description: 'Maximum requests per minute per IP',
        category: 'security',
    },
    {
        key: 'log_level',
        value: 'info',
        description: 'Logging level (debug, info, warn, error)',
        category: 'monitoring',
    },
    {
        key: 'log_retention_days',
        value: '30',
        description: 'Log retention period in days',
        category: 'monitoring',
    },
    {
        key: 'alert_on_errors',
        value: 'true',
        description: 'Send alerts on critical errors',
        category: 'monitoring',
    },
    {
        key: 'monitoring_enabled',
        value: 'true',
        description: 'Enable system monitoring',
        category: 'monitoring',
    },
    {
        key: 'performance_tracking',
        value: 'true',
        description: 'Track performance metrics',
        category: 'monitoring',
    },
    {
        key: 'welcome_message',
        value: 'Welcome to our bot! Use /start to begin.',
        description: 'Welcome message for new users',
        category: 'content',
    },
    {
        key: 'help_message',
        value: 'Available commands: /start, /balance, /tasks, /support',
        description: 'Help message',
        category: 'content',
    },
    {
        key: 'support_message',
        value: 'For support, contact @support',
        description: 'Support contact message',
        category: 'content',
    },
    {
        key: 'greeting_template',
        value: 'Hello, {first_name}!',
        description: 'Greeting template with variables',
        category: 'content',
    },
    {
        key: 'language',
        value: 'ru',
        description: 'Default language (ru, en, etc.)',
        category: 'content',
    },
    { key: 'timezone', value: 'Europe/Moscow', description: 'Default timezone', category: 'content' },
    { key: 'date_format', value: 'DD.MM.YYYY', description: 'Date format', category: 'content' },
    {
        key: 'api_rate_limit',
        value: '100',
        description: 'API rate limit per minute',
        category: 'integrations',
    },
    {
        key: 'backup_enabled',
        value: 'true',
        description: 'Enable automatic backups',
        category: 'integrations',
    },
    {
        key: 'backup_interval_hours',
        value: '24',
        description: 'Backup interval in hours',
        category: 'integrations',
    },
    {
        key: 'notification_service_enabled',
        value: 'false',
        description: 'Enable external notification service',
        category: 'integrations',
    },
    {
        key: 'analytics_enabled',
        value: 'true',
        description: 'Enable analytics tracking',
        category: 'integrations',
    },
    {
        key: 'fake_stats_enabled',
        value: 'true',
        description: 'Enable fake statistics generation',
        category: 'fake',
    },
    {
        key: 'fake_stats_update_interval_hours',
        value: '4',
        description: 'Fake stats update interval',
        category: 'fake',
    },
    {
        key: 'fake_stats_max_delta_percent',
        value: '15',
        description: 'Maximum deviation from real stats (%)',
        category: 'fake',
    },
    {
        key: 'fake_stats_trend_min',
        value: '-0.02',
        description: 'Minimum trend value',
        category: 'fake',
    },
    {
        key: 'fake_stats_trend_max',
        value: '0.03',
        description: 'Maximum trend value',
        category: 'fake',
    },
    {
        key: 'fake_stats_noise_stddev',
        value: '0.01',
        description: 'Noise standard deviation',
        category: 'fake',
    },
    {
        key: 'task_completion_reward_min',
        value: '0.50',
        description: 'Minimum task reward in USDT',
        category: 'fake',
    },
    {
        key: 'task_completion_reward_max',
        value: '50.00',
        description: 'Maximum task reward in USDT',
        category: 'fake',
    },
    {
        key: 'daily_task_limit',
        value: '10',
        description: 'Maximum tasks per day per user',
        category: 'fake',
    },
    {
        key: 'task_timeout_minutes',
        value: '30',
        description: 'Task completion timeout',
        category: 'fake',
    },
    {
        key: 'auto_create_tasks',
        value: 'false',
        description: 'Automatically create tasks',
        category: 'fake',
    },
];
function getDefaultSettingsMap() {
    const map = new Map();
    exports.DEFAULT_SETTINGS.forEach((setting) => {
        map.set(setting.key, setting);
    });
    return map;
}
function getDefaultValue(key) {
    const setting = exports.DEFAULT_SETTINGS.find((s) => s.key === key);
    return setting?.value;
}
function getDefaultSettingsByCategory(category) {
    return exports.DEFAULT_SETTINGS.filter((s) => s.category === category);
}
//# sourceMappingURL=default-settings.js.map