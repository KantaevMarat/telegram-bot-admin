import { ButtonConfig } from '../../types/button.types';
import { Smartphone, Monitor } from 'lucide-react';
import { useState } from 'react';

interface ButtonPreviewProps {
  config: ButtonConfig;
}

export default function ButtonPreview({ config }: ButtonPreviewProps) {
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const renderButton = () => {
    // Telegram использует стандартные стили кнопок, цвет не настраивается
    const buttonStyle: React.CSSProperties = {
      padding: viewMode === 'mobile' ? '12px 16px' : '10px 14px',
      borderRadius: '8px',
      border: `1px solid ${theme === 'dark' ? '#3a3a3a' : '#e1e1e1'}`,
      background: theme === 'dark' ? '#2a2a2a' : '#f7f7f7',
      color: theme === 'dark' ? '#ffffff' : '#1a1a1c',
      fontSize: viewMode === 'mobile' ? '16px' : '14px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      width: '100%',
      justifyContent: 'center',
      transition: 'opacity 0.2s',
    };

    return (
      <button style={buttonStyle}>
        {config.icon && <span>{config.icon}</span>}
        <span>{config.label}</span>
      </button>
    );
  };

  const renderSubmenu = () => {
    const textColor = theme === 'dark' ? '#ffffff' : '#1a1a1c';
    const secondaryTextColor = theme === 'dark' ? '#b3b3b3' : '#4a4a4a';
    const bgSecondary = theme === 'dark' ? '#2a2a2a' : '#f7f7f7';
    const bgPrimary = theme === 'dark' ? '#1e1e1e' : '#ffffff';
    
    if (!config.sections || config.sections.length === 0) {
      return (
        <div style={{ padding: '16px', textAlign: 'center', color: secondaryTextColor }}>
          Нет разделов
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {config.sections.map((section) => (
          <div key={section.id} style={{ marginBottom: '16px' }}>
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: '8px',
                color: textColor,
              }}
            >
              {section.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {section.subbuttons.map((subButton) => (
                <div
                  key={subButton.id}
                  style={{
                    padding: '10px 12px',
                    background: bgSecondary,
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: 'var(--font-size-sm)',
                    color: textColor,
                  }}
                >
                  {subButton.icon && <span>{subButton.icon}</span>}
                  <span style={{ flex: 1 }}>{subButton.label}</span>
                  <span
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      color: secondaryTextColor,
                      padding: '2px 6px',
                      background: bgPrimary,
                      borderRadius: '4px',
                    }}
                  >
                    {subButton.mode}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const containerStyle: React.CSSProperties = {
    width: viewMode === 'mobile' ? '375px' : '100%',
    maxWidth: viewMode === 'mobile' ? '375px' : '600px',
    margin: '0 auto',
    background: theme === 'dark' ? '#1e1e1e' : '#ffffff',
    borderRadius: '12px',
    padding: viewMode === 'mobile' ? '20px' : '24px',
    border: '1px solid var(--border)',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Preview Controls */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setViewMode('mobile')}
            className={`btn btn--secondary btn--sm ${viewMode === 'mobile' ? 'btn--active' : ''}`}
          >
            <Smartphone size={16} />
            Мобильный
          </button>
          <button
            type="button"
            onClick={() => setViewMode('desktop')}
            className={`btn btn--secondary btn--sm ${viewMode === 'desktop' ? 'btn--active' : ''}`}
          >
            <Monitor size={16} />
            Десктоп
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`btn btn--secondary btn--sm ${theme === 'light' ? 'btn--active' : ''}`}
          >
            ☀️ Светлая
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`btn btn--secondary btn--sm ${theme === 'dark' ? 'btn--active' : ''}`}
          >
            🌙 Тёмная
          </button>
        </div>
      </div>

      {/* Preview Container */}
      <div style={containerStyle}>
        <div
          style={{
            fontSize: 'var(--font-size-xs)',
            color: theme === 'dark' ? '#b3b3b3' : '#4a4a4a',
            marginBottom: '12px',
            textAlign: 'center',
          }}
        >
          Превью: {config.label}
        </div>

        {config.mode === 'submenu' ? (
          renderSubmenu()
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {renderButton()}
            {config.mode === 'text' && config.payload && (
              <div
                style={{
                  padding: '12px',
                  background: theme === 'dark' ? '#2a2a2a' : '#f7f7f7',
                  borderRadius: '6px',
                  fontSize: 'var(--font-size-sm)',
                  color: theme === 'dark' ? '#ffffff' : '#1a1a1c',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {config.payload}
              </div>
            )}
            {config.mode === 'media' && config.media && (
              <div
                style={{
                  padding: '12px',
                  background: theme === 'dark' ? '#2a2a2a' : '#f7f7f7',
                  borderRadius: '6px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 'var(--font-size-sm)', color: theme === 'dark' ? '#b3b3b3' : '#4a4a4a' }}>
                  📎 {config.media.type}
                </div>
                {config.media.caption && (
                  <div style={{ marginTop: '8px', fontSize: 'var(--font-size-sm)', color: theme === 'dark' ? '#ffffff' : '#1a1a1c' }}>
                    {config.media.caption}
                  </div>
                )}
              </div>
            )}
            {config.mode === 'url' && config.payload && (
              <div
                style={{
                  padding: '12px',
                  background: theme === 'dark' ? '#2a2a2a' : '#f7f7f7',
                  borderRadius: '6px',
                  fontSize: 'var(--font-size-sm)',
                  color: theme === 'dark' ? '#06B6D4' : '#0284c7',
                  wordBreak: 'break-all',
                }}
              >
                🔗 {config.payload}
              </div>
            )}
            {config.mode === 'command' && config.payload && (
              <div
                style={{
                  padding: '12px',
                  background: theme === 'dark' ? '#2a2a2a' : '#f7f7f7',
                  borderRadius: '6px',
                  fontSize: 'var(--font-size-sm)',
                  color: theme === 'dark' ? '#b3b3b3' : '#4a4a4a',
                }}
              >
                ⚡ Команда: {config.payload}
              </div>
            )}
            {config.mode === 'function' && (
              <div
                style={{
                  padding: '12px',
                  background: theme === 'dark' ? '#2a2a2a' : '#f7f7f7',
                  borderRadius: '6px',
                  fontSize: 'var(--font-size-sm)',
                  color: theme === 'dark' ? '#b3b3b3' : '#4a4a4a',
                }}
              >
                🔧 Функция: {config.function?.type || 'не указана'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

