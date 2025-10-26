"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSettings = initializeSettings;
const settings_entity_1 = require("../entities/settings.entity");
const settingsData = [
    {
        key: 'bot_enabled',
        value: 'true',
        description: 'Включен ли бот (true/false)',
    },
    {
        key: 'bot_username',
        value: 'YourBotUsername',
        description: 'Username бота в Telegram',
    },
    {
        key: 'bot_token',
        value: '',
        description: 'Токен бота (заполняется автоматически)',
    },
    {
        key: 'webhook_url',
        value: '',
        description: 'URL для webhook (автоматически)',
    },
    {
        key: 'max_users_per_hour',
        value: '1000',
        description: 'Максимальное количество пользователей в час',
    },
    {
        key: 'max_messages_per_minute',
        value: '60',
        description: 'Максимальное количество сообщений в минуту от одного пользователя',
    },
    {
        key: 'anti_spam_enabled',
        value: 'true',
        description: 'Включена ли защита от спама',
    },
    {
        key: 'auto_reply_enabled',
        value: 'true',
        description: 'Включены ли автоматические ответы',
    },
    {
        key: 'maintenance_mode',
        value: 'false',
        description: 'Режим технического обслуживания',
    },
    {
        key: 'maintenance_message',
        value: '🛠️ Бот находится на техническом обслуживании. Пожалуйста, подождите.',
        description: 'Сообщение в режиме обслуживания',
    },
    {
        key: 'registration_enabled',
        value: 'true',
        description: 'Разрешена ли регистрация новых пользователей',
    },
    {
        key: 'min_user_age',
        value: '16',
        description: 'Минимальный возраст пользователя',
    },
    {
        key: 'max_username_length',
        value: '32',
        description: 'Максимальная длина username',
    },
    {
        key: 'username_filter_enabled',
        value: 'true',
        description: 'Включена ли фильтрация username',
    },
    {
        key: 'banned_words',
        value: 'spam,scam,hack',
        description: 'Запрещенные слова через запятую',
    },
    {
        key: 'auto_ban_spammers',
        value: 'true',
        description: 'Автоматически банить спамеров',
    },
    {
        key: 'user_session_timeout',
        value: '86400',
        description: 'Таймаут сессии пользователя в секундах (24 часа)',
    },
    {
        key: 'currency',
        value: 'USDT',
        description: 'Основная валюта (USDT, RUB, etc.)',
    },
    {
        key: 'min_deposit',
        value: '10',
        description: 'Минимальный депозит',
    },
    {
        key: 'max_deposit',
        value: '10000',
        description: 'Максимальный депозит',
    },
    {
        key: 'min_withdraw',
        value: '20',
        description: 'Минимальный вывод',
    },
    {
        key: 'max_withdraw',
        value: '5000',
        description: 'Максимальный вывод',
    },
    {
        key: 'daily_withdraw_limit',
        value: '1000',
        description: 'Лимит вывода в день',
    },
    {
        key: 'weekly_withdraw_limit',
        value: '5000',
        description: 'Лимит вывода в неделю',
    },
    {
        key: 'monthly_withdraw_limit',
        value: '20000',
        description: 'Лимит вывода в месяц',
    },
    {
        key: 'withdraw_fee_percent',
        value: '1.5',
        description: 'Комиссия за вывод в процентах',
    },
    {
        key: 'withdraw_fee_fixed',
        value: '0.5',
        description: 'Фиксированная комиссия за вывод',
    },
    {
        key: 'ref_bonus',
        value: '5',
        description: 'Реферальный бонус',
    },
    {
        key: 'ref_bonus_level_2',
        value: '2',
        description: 'Реферальный бонус 2 уровня',
    },
    {
        key: 'ref_bonus_level_3',
        value: '1',
        description: 'Реферальный бонус 3 уровня',
    },
    {
        key: 'tasks_enabled',
        value: 'true',
        description: 'Включены ли задания',
    },
    {
        key: 'min_reward',
        value: '1',
        description: 'Минимальная награда за задание',
    },
    {
        key: 'max_reward',
        value: '100',
        description: 'Максимальная награда за задание',
    },
    {
        key: 'task_completion_bonus',
        value: '0.1',
        description: 'Бонус за выполнение задания (в % от награды)',
    },
    {
        key: 'daily_task_limit',
        value: '10',
        description: 'Лимит заданий в день на пользователя',
    },
    {
        key: 'task_timeout',
        value: '3600',
        description: 'Таймаут между заданиями в секундах',
    },
    {
        key: 'work_cooldown_sec',
        value: '3600',
        description: 'Кулдаун между работами в секундах',
    },
    {
        key: 'auto_create_tasks',
        value: 'false',
        description: 'Автоматически создавать задания',
    },
    {
        key: 'task_creation_interval',
        value: '3600',
        description: 'Интервал создания заданий в секундах',
    },
    {
        key: 'two_factor_required',
        value: 'false',
        description: 'Обязательная двухфакторная аутентификация',
    },
    {
        key: 'password_min_length',
        value: '8',
        description: 'Минимальная длина пароля',
    },
    {
        key: 'password_require_special',
        value: 'true',
        description: 'Требовать специальные символы в пароле',
    },
    {
        key: 'login_attempts_limit',
        value: '5',
        description: 'Лимит попыток входа',
    },
    {
        key: 'login_lockout_time',
        value: '900',
        description: 'Время блокировки после неудачных попыток (секунды)',
    },
    {
        key: 'suspicious_activity_detection',
        value: 'true',
        description: 'Обнаружение подозрительной активности',
    },
    {
        key: 'ip_whitelist',
        value: '',
        description: 'Белый список IP адресов (через запятую)',
    },
    {
        key: 'ip_blacklist',
        value: '',
        description: 'Черный список IP адресов (через запятую)',
    },
    {
        key: 'rate_limiting_enabled',
        value: 'true',
        description: 'Включено ли ограничение запросов',
    },
    {
        key: 'requests_per_minute',
        value: '60',
        description: 'Максимальное количество запросов в минуту',
    },
    {
        key: 'log_level',
        value: 'info',
        description: 'Уровень логирования (error, warn, info, debug)',
    },
    {
        key: 'log_user_actions',
        value: 'true',
        description: 'Логировать действия пользователей',
    },
    {
        key: 'log_admin_actions',
        value: 'true',
        description: 'Логировать действия администраторов',
    },
    {
        key: 'log_financial_transactions',
        value: 'true',
        description: 'Логировать финансовые транзакции',
    },
    {
        key: 'alert_email_enabled',
        value: 'false',
        description: 'Включены ли email уведомления',
    },
    {
        key: 'alert_email',
        value: 'admin@example.com',
        description: 'Email для уведомлений',
    },
    {
        key: 'alert_telegram_enabled',
        value: 'true',
        description: 'Включены ли Telegram уведомления',
    },
    {
        key: 'alert_telegram_chat_id',
        value: '',
        description: 'Chat ID для Telegram уведомлений',
    },
    {
        key: 'monitoring_dashboard_enabled',
        value: 'true',
        description: 'Включена ли панель мониторинга',
    },
    {
        key: 'performance_monitoring',
        value: 'true',
        description: 'Мониторинг производительности',
    },
    {
        key: 'welcome_message',
        value: '🎉 Добро пожаловать в наш Telegram бот!\n\nЗдесь вы можете зарабатывать, выполняя простые задания.',
        description: 'Приветственное сообщение',
    },
    {
        key: 'help_message',
        value: '📋 Доступные команды:\n/start - начать работу\n/tasks - список заданий\n/balance - баланс\n/withdraw - вывод средств\n/referrals - рефералы\n/help - помощь',
        description: 'Сообщение помощи',
    },
    {
        key: 'support_text',
        value: 'По всем вопросам обращайтесь в поддержку: @support',
        description: 'Текст поддержки',
    },
    {
        key: 'greeting_template',
        value: '👋 Добро пожаловать!\n\n📊 Статистика системы:\n👥 Онлайн: {fake.online} чел.\n💎 Активных: {fake.active}\n💰 Выплачено: {fake.paid} USDT\n\n🎁 Бонус новичка: +10 USDT за первое задание!',
        description: 'Шаблон приветствия',
    },
    {
        key: 'language',
        value: 'ru',
        description: 'Язык интерфейса (ru, en, etc.)',
    },
    {
        key: 'timezone',
        value: 'Europe/Moscow',
        description: 'Часовой пояс',
    },
    {
        key: 'date_format',
        value: 'DD.MM.YYYY HH:mm',
        description: 'Формат даты',
    },
    {
        key: 'payment_provider',
        value: 'manual',
        description: 'Провайдер платежей (manual, crypto_api, etc.)',
    },
    {
        key: 'payment_api_key',
        value: '',
        description: 'API ключ платежного провайдера',
    },
    {
        key: 'payment_secret_key',
        value: '',
        description: 'Секретный ключ платежного провайдера',
    },
    {
        key: 'notification_service',
        value: 'telegram',
        description: 'Сервис уведомлений (telegram, email, sms)',
    },
    {
        key: 'analytics_enabled',
        value: 'true',
        description: 'Включена ли аналитика',
    },
    {
        key: 'backup_enabled',
        value: 'true',
        description: 'Включено ли резервное копирование',
    },
    {
        key: 'backup_interval',
        value: '86400',
        description: 'Интервал резервного копирования (секунды)',
    },
    {
        key: 'api_rate_limit',
        value: '1000',
        description: 'Лимит API запросов в час',
    },
    {
        key: 'fake_stats_enabled',
        value: 'true',
        description: 'Включены ли фейковые статистические данные',
    },
    {
        key: 'fake_online_min',
        value: '100',
        description: 'Минимальное количество фейковых онлайн пользователей',
    },
    {
        key: 'fake_online_max',
        value: '500',
        description: 'Максимальное количество фейковых онлайн пользователей',
    },
    {
        key: 'fake_active_min',
        value: '50',
        description: 'Минимальное количество активных пользователей',
    },
    {
        key: 'fake_active_max',
        value: '200',
        description: 'Максимальное количество активных пользователей',
    },
    {
        key: 'fake_paid_min',
        value: '1000',
        description: 'Минимальное количество выплаченных средств',
    },
    {
        key: 'fake_paid_max',
        value: '50000',
        description: 'Максимальное количество выплаченных средств',
    },
    {
        key: 'fake_stats_update_interval',
        value: '3600',
        description: 'Интервал обновления фейковых данных (секунды)',
    },
];
async function initializeSettings(dataSource) {
    console.log('🔧 Инициализация настроек...');
    const settingsRepository = dataSource.getRepository(settings_entity_1.Settings);
    for (const settingData of settingsData) {
        const existingSetting = await settingsRepository.findOne({
            where: { key: settingData.key },
        });
        if (!existingSetting) {
            const setting = settingsRepository.create({
                key: settingData.key,
                value: settingData.value,
                description: settingData.description,
            });
            await settingsRepository.save(setting);
            console.log(`✅ Добавлена настройка: ${settingData.key}`);
        }
        else {
            console.log(`⏭️  Настройка уже существует: ${settingData.key}`);
        }
    }
    console.log('🎉 Инициализация настроек завершена!');
}
//# sourceMappingURL=init-settings.js.map