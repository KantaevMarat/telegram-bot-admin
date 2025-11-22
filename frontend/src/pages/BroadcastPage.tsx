import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { broadcastApi, mediaApi } from '../api/client';
import toast from 'react-hot-toast';
import { Send, Image, Clock, Users, BarChart, Calendar, Trash2, CheckCircle, XCircle, Loader, AlertCircle, Film, FileText, Upload, X } from 'lucide-react';

interface Broadcast {
  id: string;
  text: string;
  media_urls: string[] | null;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_users: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

export default function BroadcastPage() {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);

  // Получение списка рассылок
  const { data: broadcasts = [] } = useQuery<Broadcast[]>({
    queryKey: ['broadcasts'],
    queryFn: broadcastApi.getAllBroadcasts,
  });

  // Создание рассылки
  const createMutation = useMutation({
    mutationFn: (data: any) => broadcastApi.sendBroadcast(data),
    onSuccess: (response) => {
      if (isScheduled) {
        toast.success('Рассылка запланирована!');
      } else {
        toast.success(`Рассылка запущена для ${response.total_users} пользователей`);
      }
      setText('');
      setMediaUrl('');
      setSelectedFile(null);
      setScheduledAt('');
      setIsScheduled(false);
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
    },
    onError: (err: any) => {
      const message = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : (err.response?.data?.message || err.message);
      toast.error(`Ошибка: ${message}`);
    },
  });

  // Удаление рассылки
  const deleteMutation = useMutation({
    mutationFn: (id: string) => broadcastApi.deleteBroadcast(id),
    onSuccess: () => {
      toast.success('Рассылка удалена');
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Ошибка удаления');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !selectedFile) {
      toast.error('Введите текст сообщения или выберите файл');
      return;
    }
    
    if (isScheduled && !scheduledAt) {
      toast.error('Выберите дату и время');
      return;
    }

    let finalMediaUrl = mediaUrl;

    // Загружаем файл если он выбран
    if (selectedFile) {
      try {
        setUploadingFile(true);
        const result = await mediaApi.uploadFile(selectedFile);
        finalMediaUrl = result.url;
      } catch (error) {
        toast.error('Ошибка загрузки файла');
        setUploadingFile(false);
        return;
      } finally {
        setUploadingFile(false);
      }
    }

    createMutation.mutate({
      text,
      media_urls: finalMediaUrl ? [finalMediaUrl] : [],
      scheduled_at: isScheduled ? scheduledAt : undefined,
      batchSize: 30,
      throttle: 1000,
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { color: string; icon: JSX.Element }> = {
      draft: { color: 'var(--text-tertiary)', icon: <AlertCircle size={14} /> },
      scheduled: { color: 'var(--warning)', icon: <Clock size={14} /> },
      sending: { color: 'var(--info)', icon: <Loader size={14} /> },
      completed: { color: 'var(--success)', icon: <CheckCircle size={14} /> },
      failed: { color: 'var(--error)', icon: <XCircle size={14} /> },
    };

    const style = styles[status] || styles.draft;

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-medium)',
        color: style.color,
        background: `${style.color}15`,
      }}>
        {style.icon}
        {status === 'draft' && 'Черновик'}
        {status === 'scheduled' && 'Запланировано'}
        {status === 'sending' && 'Отправка...'}
        {status === 'completed' && 'Завершено'}
        {status === 'failed' && 'Ошибка'}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const stats = {
    total: broadcasts.length,
    scheduled: broadcasts.filter(b => b.status === 'scheduled').length,
    completed: broadcasts.filter(b => b.status === 'completed').length,
    failed: broadcasts.filter(b => b.status === 'failed').length,
  };

  return (
    <div className="page">
      {/* Page Header */}
      <header className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Рассылки</h1>
          <p className="page-subtitle">Отправка и планирование сообщений</p>
        </div>
      </header>

      {/* Statistics Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-card__icon" style={{ backgroundColor: 'var(--accent-light)' }}>
            <Send size={24} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{stats.total}</div>
            <div className="stat-card__label">Всего рассылок</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon" style={{ backgroundColor: 'var(--warning-light)' }}>
            <Clock size={24} style={{ color: 'var(--warning)' }} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{stats.scheduled}</div>
            <div className="stat-card__label">Запланировано</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon" style={{ backgroundColor: 'var(--success-light)' }}>
            <CheckCircle size={24} style={{ color: 'var(--success)' }} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{stats.completed}</div>
            <div className="stat-card__label">Завершено</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon" style={{ backgroundColor: 'var(--error-light)' }}>
            <XCircle size={24} style={{ color: 'var(--error)' }} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{stats.failed}</div>
            <div className="stat-card__label">Ошибки</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="two-column-layout">
        {/* Form */}
        <div className="card">
          <div className="card-header">
            <Send size={24} style={{ color: 'var(--accent)' }} />
            <h2 className="card-title">Новая рассылка</h2>
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
                Максимум 4000 символов
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">
                Медиафайл (фото или видео)
              </label>
              
              {/* Превью выбранного файла */}
              {selectedFile && (
                <div style={{
                  marginBottom: '12px',
                  padding: '12px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    {selectedFile.type.startsWith('image/') ? (
                      <Image size={20} style={{ color: 'var(--accent)' }} />
                    ) : selectedFile.type.startsWith('video/') ? (
                      <Film size={20} style={{ color: 'var(--accent)' }} />
                    ) : (
                      <FileText size={20} style={{ color: 'var(--accent)' }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: 'var(--font-size-sm)', 
                        fontWeight: 'var(--font-weight-medium)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {selectedFile.name}
                      </div>
                      <div style={{ 
                        fontSize: 'var(--font-size-xs)', 
                        color: 'var(--text-tertiary)',
                        marginTop: '2px'
                      }}>
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} МБ • {selectedFile.type.startsWith('image/') ? 'Фото' : selectedFile.type.startsWith('video/') ? 'Видео' : 'Файл'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Кнопки выбора файла */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                {/* Кнопка загрузки фото */}
                <button
                  type="button"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 50 * 1024 * 1024) {
                          toast.error('Файл слишком большой (максимум 50 МБ)');
                          return;
                        }
                        setSelectedFile(file);
                        setMediaUrl('');
                      }
                    };
                    input.click();
                  }}
                  disabled={uploadingFile || createMutation.isPending}
                  className="btn btn--secondary"
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    minWidth: '180px',
                    justifyContent: 'center'
                  }}
                >
                  <Image size={18} />
                  <span>Загрузить фото</span>
                </button>

                {/* Кнопка загрузки видео */}
                <button
                  type="button"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'video/*';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 50 * 1024 * 1024) {
                          toast.error('Файл слишком большой (максимум 50 МБ)');
                          return;
                        }
                        setSelectedFile(file);
                        setMediaUrl('');
                      }
                    };
                    input.click();
                  }}
                  disabled={uploadingFile || createMutation.isPending}
                  className="btn btn--secondary"
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    minWidth: '180px',
                    justifyContent: 'center'
                  }}
                >
                  <Film size={18} />
                  <span>Загрузить видео</span>
                </button>
              </div>

              {/* Или ввести URL */}
              {!selectedFile && (
                <div style={{ marginTop: '12px' }}>
                  <div className="search-input">
                    <Image size={18} className="search-input__icon" />
                    <input
                      type="url"
                      className="search-input__field"
                      value={mediaUrl}
                      onChange={(e) => {
                        setMediaUrl(e.target.value);
                        setSelectedFile(null);
                      }}
                      placeholder="Или введите URL медиафайла..."
                    />
                  </div>
                </div>
              )}

              <p style={{ 
                margin: '8px 0 0 0', 
                fontSize: 'var(--font-size-xs)', 
                color: 'var(--text-tertiary)' 
              }}>
                📷 Фото: JPG, PNG, GIF • 🎬 Видео: MP4, MOV, AVI • Максимум 50 МБ
              </p>
            </div>

            {/* Scheduled Checkbox */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
            onClick={() => setIsScheduled(!isScheduled)}
            >
              <input
                type="checkbox"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <Calendar size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                Запланировать отправку
              </span>
            </div>

            {/* DateTime Picker */}
            {isScheduled && (
              <div className="form-group">
                <label className="form-label">
                  Дата и время отправки *
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  required={isScheduled}
                />
                <p style={{ 
                  margin: '4px 0 0 0', 
                  fontSize: 'var(--font-size-xs)', 
                  color: 'var(--text-tertiary)' 
                }}>
                  Рассылка будет отправлена автоматически в указанное время
                </p>
              </div>
            )}

            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              paddingTop: '16px',
              borderTop: '1px solid var(--border)'
            }}>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={createMutation.isPending || uploadingFile || (!text.trim() && !selectedFile)}
              >
                <Send size={16} />
                {uploadingFile ? 'Загрузка...' : createMutation.isPending ? 'Отправка...' : isScheduled ? 'Запланировать' : 'Отправить сейчас'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setText('');
                  setMediaUrl('');
                  setSelectedFile(null);
                  setScheduledAt('');
                  setIsScheduled(false);
                }}
                className="btn btn--secondary"
                disabled={createMutation.isPending || uploadingFile}
              >
                Очистить
              </button>
            </div>
          </form>
        </div>

        {/* Broadcasts List */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-header">
            <BarChart size={24} style={{ color: 'var(--accent)' }} />
            <h2 className="card-title">История рассылок</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflowY: 'auto' }}>
            {broadcasts.length === 0 ? (
              <div style={{
                padding: '32px',
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: 'var(--font-size-sm)',
              }}>
                <Send size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p>Рассылок пока нет</p>
              </div>
            ) : (
              broadcasts.map((broadcast) => (
                <div
                  key={broadcast.id}
                  style={{
                    padding: '16px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    {getStatusBadge(broadcast.status)}
                    
                    {broadcast.status === 'scheduled' && (
                      <button
                        onClick={() => deleteMutation.mutate(broadcast.id)}
                        disabled={deleteMutation.isPending}
                        style={{
                          padding: '4px 8px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--error)',
                          cursor: 'pointer',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: 'var(--font-size-xs)',
                        }}
                      >
                        <Trash2 size={12} />
                        Удалить
                      </button>
                    )}
                  </div>

                  <p style={{
                    margin: '8px 0',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-primary)',
                    lineHeight: '1.4',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {broadcast.text}
                  </p>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                      <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      {broadcast.scheduled_at ? formatDate(broadcast.scheduled_at) : formatDate(broadcast.created_at)}
                    </div>
                    
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                      <Users size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      {broadcast.sent_count} / {broadcast.total_users}
                    </div>
                  </div>

                  {broadcast.status === 'completed' && broadcast.completed_at && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px',
                      background: 'var(--success-light)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--success)',
                    }}>
                      ✓ Завершено: {formatDate(broadcast.completed_at)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
