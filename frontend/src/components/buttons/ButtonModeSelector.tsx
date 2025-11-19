import { ButtonMode } from '../../types/button.types';
import { Terminal, MessageSquare, Image, Link, Code, Menu } from 'lucide-react';

interface ButtonModeSelectorProps {
  value: ButtonMode;
  onChange: (mode: ButtonMode) => void;
}

const modes: { value: ButtonMode; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'command',
    label: 'Команда',
    icon: <Terminal size={20} />,
    description: 'Выполнить команду бота (например /start)',
  },
  {
    value: 'text',
    label: 'Текст',
    icon: <MessageSquare size={20} />,
    description: 'Отправить текстовое сообщение',
  },
  {
    value: 'media',
    label: 'Медиа',
    icon: <Image size={20} />,
    description: 'Отправить фото, видео, аудио или документ',
  },
  {
    value: 'url',
    label: 'Ссылка',
    icon: <Link size={20} />,
    description: 'Открыть URL в браузере',
  },
  {
    value: 'function',
    label: 'Функция',
    icon: <Code size={20} />,
    description: 'Выполнить webhook, скрипт или внутреннюю функцию',
  },
  {
    value: 'submenu',
    label: 'Меню',
    icon: <Menu size={20} />,
    description: 'Открыть подменю с разделами и подкнопками',
  },
];

export default function ButtonModeSelector({ value, onChange }: ButtonModeSelectorProps) {
  return (
    <div className="form-group">
      <label className="form-label">Режим кнопки</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {modes.map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            className={`btn ${value === mode.value ? 'btn--primary' : 'btn--secondary'}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '16px',
              textAlign: 'center',
              minWidth: 0,
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ color: value === mode.value ? 'var(--primary)' : 'var(--text-secondary)' }}>
              {mode.icon}
            </div>
            <div style={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>
              <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
                {mode.label}
              </div>
              <div style={{ 
                fontSize: 'var(--font-size-xs)', 
                color: 'var(--text-secondary)', 
                marginTop: '4px',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'normal',
                lineHeight: '1.4',
              }}>
                {mode.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

