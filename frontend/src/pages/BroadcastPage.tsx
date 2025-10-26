import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { broadcastApi } from '../api/client';
import toast from 'react-hot-toast';
import { Send, Image, Link, Clock, Users, BarChart, AlertTriangle } from 'lucide-react';

export default function BroadcastPage() {
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  const mutation = useMutation({
    mutationFn: (data: any) => broadcastApi.sendBroadcast(data),
    onSuccess: (response) => {
      toast.success(`Рассылка запланирована для ${response.total_users} пользователей`);
      setText('');
      setMediaUrl('');
    },
    onError: (err: any) => {
      const message = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : (err.response?.data?.message || err.message);
      toast.error(`Ошибка отправки рассылки: ${message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      toast.error('Введите текст сообщения');
      return;
    }
    mutation.mutate({
      text,
      media_urls: mediaUrl ? [mediaUrl] : [],
      batchSize: 30, // Default batch size
      throttle: 1000,  // Default throttle
    });
  };

  return (
    <div className="page">
      {/* Page Header */}
      <header className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Рассылки</h1>
          <p className="page-subtitle">Отправка сообщений всем пользователям</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="two-column-layout">
        {/* Form */}
        <div className="card">
          <div className="card-header">
            <Send size={24} style={{ color: 'var(--accent)' }} />
            <h2 className="card-title">Создать рассылку</h2>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label">
                Текст сообщения *
              </label>
              <textarea
                className="form-textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Введите текст сообщения для рассылки..."
                rows={6}
                required
              />
              <p style={{ 
                margin: '4px 0 0 0', 
                fontSize: 'var(--font-size-xs)', 
                color: 'var(--text-tertiary)' 
              }}>
                Максимум 4000 символов. Используйте Markdown для форматирования.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">
                URL медиафайла
              </label>
              <div className="search-input">
                <Image size={18} className="search-input__icon" />
                <input
                  type="url"
                  className="search-input__field"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <p style={{ 
                margin: '4px 0 0 0', 
                fontSize: 'var(--font-size-xs)', 
                color: 'var(--text-tertiary)' 
              }}>
                Поддерживаются изображения, видео и документы
              </p>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              paddingTop: '16px',
              borderTop: '1px solid var(--border)'
            }}>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={mutation.isPending || !text.trim()}
              >
                <Send size={16} />
                {mutation.isPending ? 'Отправка...' : 'Отправить рассылку'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setText('');
                  setMediaUrl('');
                }}
                className="btn btn--secondary"
                disabled={mutation.isPending}
              >
                Очистить
              </button>
            </div>
          </form>
        </div>

        {/* Info Panel */}
        <div>
          {/* Statistics */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <BarChart size={20} style={{ color: 'var(--accent)' }} />
              <h3 style={{ margin: '0', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
                Статистика
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)'
              }}>
                <Users size={16} style={{ color: 'var(--info)' }} />
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                  Всего пользователей: <strong style={{ color: 'var(--text-primary)' }}>1,234</strong>
                </span>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)'
              }}>
                <Send size={16} style={{ color: 'var(--success)' }} />
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                  Отправлено сегодня: <strong style={{ color: 'var(--text-primary)' }}>5</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="card">
            <div className="card-header">
              <AlertTriangle size={20} style={{ color: 'var(--warning)' }} />
              <h3 style={{ margin: '0', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
                Рекомендации
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '8px',
                padding: '8px 0'
              }}>
                <Clock size={14} style={{ color: 'var(--text-tertiary)', marginTop: '2px' }} />
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Рассылки отправляются батчами по 30 сообщений с задержкой 1 секунда
                </span>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '8px',
                padding: '8px 0'
              }}>
                <Image size={14} style={{ color: 'var(--text-tertiary)', marginTop: '2px' }} />
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Медиафайлы должны быть доступны по прямой ссылке
                </span>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '8px',
                padding: '8px 0'
              }}>
                <Link size={14} style={{ color: 'var(--text-tertiary)', marginTop: '2px' }} />
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Используйте Markdown для форматирования текста
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}