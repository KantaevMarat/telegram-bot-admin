import { useState, useEffect } from 'react';
import { settingsApi } from '../api/client';
import {
  Settings, Bot, Users, DollarSign, Shield, Monitor,
  MessageSquare, Globe, Database, Search, Download,
  RotateCcw, CheckCircle, Save
} from 'lucide-react';

interface Setting {
  key: string;
  value: string;
  description: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [initialSettings, setInitialSettings] = useState<Setting[]>([]);
  const [activeTab, setActiveTab] = useState('bot');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  const [settingGroups, setSettingGroups] = useState({
    bot: {
      id: 'bot',
      name: 'Управление ботом',
      icon: Bot,
      description: 'Основные настройки бота и его поведение',
      settings: [] as Setting[]
    },
    users: {
      id: 'users',
      name: 'Пользователи',
      icon: Users,
      description: 'Настройки регистрации и управления пользователями',
      settings: [] as Setting[]
    },
    financial: {
      id: 'financial',
      name: 'Финансы',
      icon: DollarSign,
      description: 'Финансовые настройки, лимиты и комиссии',
      settings: [] as Setting[]
    },
    security: {
      id: 'security',
      name: 'Безопасность',
      icon: Shield,
      description: 'Настройки безопасности и доступа',
      settings: [] as Setting[]
    },
    system: {
      id: 'system',
      name: 'Система',
      icon: Monitor,
      description: 'Системные настройки и производительность',
      settings: [] as Setting[]
    },
    notifications: {
      id: 'notifications',
      name: 'Уведомления',
      icon: MessageSquare,
      description: 'Настройки уведомлений и сообщений',
      settings: [] as Setting[]
    },
    integration: {
      id: 'integration',
      name: 'Интеграции',
      icon: Globe,
      description: 'Внешние сервисы и API',
      settings: [] as Setting[]
    },
    database: {
      id: 'database',
      name: 'База данных',
      icon: Database,
      description: 'Настройки базы данных и резервного копирования',
      settings: [] as Setting[]
    },
    analytics: {
      id: 'analytics',
      name: 'Аналитика',
      icon: Settings,
      description: 'Настройки статистики и аналитики',
      settings: [] as Setting[]
    }
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      console.log('🔧 Starting to load settings...');
      const response = await settingsApi.getSettings();
      console.log('🔧 Raw response:', response);
      const settingsData = response || [];
      
      console.log('🔧 Settings loaded:', settingsData.length, 'items');
      console.log('🔧 First few settings:', settingsData.slice(0, 3));
      
      setSettings(settingsData);
      setInitialSettings(JSON.parse(JSON.stringify(settingsData)));

      // Group settings by category
      const grouped = { ...settingGroups };
      
      // Clear existing settings
      Object.values(grouped).forEach(group => group.settings = []);
      
      settingsData.forEach((setting: Setting) => {
        const key = setting.key.toLowerCase();
        let category = 'system'; // default
        
        // Bot settings
        if (key.startsWith('bot_') || key.includes('welcome') || key.includes('help')) {
          category = 'bot';
        }
        // User settings
        else if (key.startsWith('user_') || key.includes('registration') || key.includes('username') || key.includes('age')) {
          category = 'users';
        }
        // Financial settings
        else if (key.includes('deposit') || key.includes('withdraw') || key.includes('payout') || key.includes('reward') || key.includes('bonus') || key.includes('fee') || key.includes('balance') || key.includes('currency')) {
          category = 'financial';
        }
        // Security settings
        else if (key.includes('password') || key.includes('login') || key.includes('ban') || key.includes('spam') || key.includes('security') || key.includes('two_factor') || key.includes('rate_limit')) {
          category = 'security';
        }
        // Notification settings
        else if (key.includes('alert') || key.includes('notification') || key.includes('email') || key.includes('telegram')) {
          category = 'notifications';
        }
        // System settings
        else if (key.includes('maintenance') || key.includes('backup') || key.includes('database') || key.includes('log') || key.includes('debug') || key.includes('timezone') || key.includes('language')) {
          category = 'system';
        }
        // Fake stats settings
        else if (key.includes('fake_') || key.includes('stats')) {
          category = 'analytics';
        }
        
        if (grouped[category as keyof typeof grouped]) {
          grouped[category as keyof typeof grouped].settings.push(setting);
        } else {
          grouped.system.settings.push(setting);
        }
      });
      
      console.log('🔧 Grouped settings:', grouped);
      setSettingGroups(grouped);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleValueChange = (key: string, value: string) => {
    setLocalValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const hasChanges = () => {
    return Object.keys(localValues).length > 0;
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      setSaveMessage('');

      // Filter out empty values that were not intentionally changed to empty
      // Only include values that are different from initial settings
      const changes = Object.entries(localValues)
        .filter(([key, value]) => {
          const initialSetting = settings.find(s => s.key === key);
          // Include if value is different from initial, or if it's explicitly set (even if empty)
          return initialSetting && initialSetting.value !== value;
        })
        .map(([key, value]) => ({
          key,
          value: value !== undefined && value !== null ? String(value) : ''
        }));
      
      await settingsApi.updateSettings(changes);
      
      // Update local state
      const updatedSettings = settings.map(setting => 
        localValues[setting.key] !== undefined 
          ? { ...setting, value: localValues[setting.key] }
          : setting
      );
      
      setSettings(updatedSettings);
      setInitialSettings(JSON.parse(JSON.stringify(updatedSettings)));
      setLocalValues({});
      setSaveMessage('Настройки успешно сохранены!');
      
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Ошибка при сохранении настроек');
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = () => {
    setLocalValues({});
    setSaveMessage('');
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `settings_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const filteredGroups = Object.values(settingGroups).filter(group => 
    group.settings.length > 0 && 
    (searchQuery === '' || 
     group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     group.settings.some(setting => 
       setting.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
       setting.description.toLowerCase().includes(searchQuery.toLowerCase())
     )
    )
  );

  console.log('🔧 Filtered groups:', filteredGroups.length, 'groups');
  console.log('🔧 Groups with settings:', Object.values(settingGroups).map(g => ({ name: g.name, count: g.settings.length })));

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-section">
            <h1 className="page-title">Настройки</h1>
            <p className="page-subtitle">Управление конфигурацией системы</p>
          </div>
        </div>
        
        <div className="loading">
          <div className="loading-skeleton" style={{ height: '200px', marginBottom: '16px' }}></div>
          <div className="loading-skeleton" style={{ height: '200px', marginBottom: '16px' }}></div>
          <div className="loading-skeleton" style={{ height: '200px' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Page Header */}
      <header className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Настройки</h1>
          <p className="page-subtitle">Управление конфигурацией системы</p>
        </div>
        <div className="page-actions">
          <button
          onClick={exportSettings}
            className="btn btn--secondary btn--sm"
            title="Экспортировать настройки"
        >
          <Download size={16} />
            Экспорт
          </button>
          <button
            onClick={loadSettings}
            className="btn btn--secondary btn--sm"
            title="Обновить настройки"
        >
          <RotateCcw size={16} />
            Обновить
          </button>
        </div>
      </header>

      {/* Search */}
      <section className="filters-section">
        <div className="search-input">
          <Search size={18} className="search-input__icon" />
          <input
            type="text"
            className="search-input__field"
            placeholder="Поиск настроек..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </section>

      {/* Settings Content */}
      <div className="settings-layout">
        {/* Sidebar */}
        <div className="card settings-sidebar">
          <div className="settings-sidebar__header">
            <h3 className="settings-sidebar__title">
              Категории
            </h3>
          </div>
          <ul className="settings-sidebar__list">
            {filteredGroups.map((group) => {
              const Icon = group.icon;
              return (
                <li key={group.id} className="settings-sidebar__item">
                  <button
                    onClick={() => setActiveTab(group.id)}
                    className={`settings-sidebar__btn ${activeTab === group.id ? 'settings-sidebar__btn--active' : ''}`}
                  >
                    <Icon size={18} className="settings-sidebar__icon" />
                    <div className="settings-sidebar__content">
                      <div className="settings-sidebar__name">{group.name}</div>
                      <div className="settings-sidebar__desc">
                        {group.settings.length} настроек
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Main Content */}
        <div>
          {filteredGroups.map((group) => {
            if (group.id !== activeTab) return null;
            
            const Icon = group.icon;
            return (
              <div key={group.id} className="settings-section">
                <div className="settings-section__header">
                  <div className="settings-section__icon">
                    <Icon size={20} />
                  </div>
                  <div className="settings-section__title-wrapper">
                    <h2 className="settings-section__title">{group.name}</h2>
                    <p className="settings-section__desc">
                      {group.description}
                    </p>
                  </div>
                  <span className="settings-section__count">
                    {group.settings.length}
                  </span>
                </div>

                <div className="settings-group">
                  {group.settings.map((setting) => (
                    <div key={setting.key} className="setting-row">
                      <label className="setting-row__label">
                        {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </label>
                      {setting.description && (
                        <p className="setting-row__desc">
                          {setting.description}
                        </p>
                      )}
                      {setting.key === 'greeting_template' || setting.key.includes('message') || setting.key.includes('template') ? (
                        <textarea
                          className="setting-row__input"
                          rows={6}
                          value={localValues[setting.key] !== undefined ? localValues[setting.key] : setting.value || ''}
                          onChange={(e) => handleValueChange(setting.key, e.target.value)}
                          placeholder={`Введите значение для ${setting.key}`}
                          style={{ minHeight: '120px', resize: 'vertical' }}
                        />
                      ) : (
                        <input
                          type="text"
                          className="setting-row__input"
                          value={localValues[setting.key] !== undefined ? localValues[setting.key] : setting.value || ''}
                          onChange={(e) => handleValueChange(setting.key, e.target.value)}
                          placeholder={`Введите значение для ${setting.key}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Actions */}
      {hasChanges() && (
        <div className="card" style={{ marginTop: '24px' }}>
      <div style={{
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '16px',
            background: 'var(--accent-light)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--accent)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle size={20} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--accent)' }}>
                У вас есть несохраненные изменения
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={resetSettings}
                className="btn btn--secondary btn--sm"
                disabled={isSaving}
              >
                Отмена
              </button>
              <button
                onClick={saveSettings}
                className="btn btn--primary btn--sm"
                disabled={isSaving}
              >
                <Save size={16} />
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
          </div>
          </div>
        </div>
      )}

      {/* Save Message */}
      {saveMessage && (
        <div className="card" style={{ marginTop: '16px' }}>
          <div style={{ 
            padding: '12px 16px',
            background: saveMessage.includes('успешно') ? 'var(--success-light)' : 'var(--error-light)',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${saveMessage.includes('успешно') ? 'var(--success)' : 'var(--error)'}`,
            color: saveMessage.includes('успешно') ? 'var(--success)' : 'var(--error)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)'
          }}>
            {saveMessage}
            </div>
        </div>
      )}
    </div>
  );
}