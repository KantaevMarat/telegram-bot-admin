import { useState } from 'react';
import { MediaType, FunctionConfig } from '../../types/button.types';
import { Upload, X, FileImage, Video, Music, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { mediaApi } from '../../api/client';

export type CommandMode = 'text' | 'media' | 'url' | 'function' | 'command';

export interface CommandConfig {
  mode: CommandMode;
  payload?: string;
  media?: {
    type: MediaType;
    url?: string;
    caption?: string;
    file?: File;
  };
  function?: FunctionConfig;
}

interface CommandModeConfigPanelProps {
  config: CommandConfig;
  onChange: (updates: Partial<CommandConfig>) => void;
}

export default function CommandModeConfigPanel({ config, onChange }: CommandModeConfigPanelProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: MediaType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Валидация размера (50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Файл слишком большой (максимум 50 МБ)');
      return;
    }

    // Валидация типа
    const validTypes: Record<MediaType, string[]> = {
      photo: ['image/'],
      video: ['video/'],
      audio: ['audio/'],
      document: ['application/', 'text/'],
    };

    const isValidType = validTypes[type].some((prefix) => file.type.startsWith(prefix));
    if (!isValidType) {
      toast.error(`Выберите файл типа: ${type}`);
      return;
    }

    setUploading(true);
    try {
      const result = await mediaApi.uploadFile(file);
      onChange({
        media: {
          type,
          url: result.url,
          file,
        },
      });
      toast.success('Файл загружен успешно!');
    } catch (error: any) {
      toast.error(`Ошибка загрузки файла: ${error.response?.data?.message || error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const renderModeConfig = () => {
    switch (config.mode) {
      case 'text':
        return (
          <div className="form-group">
            <label className="form-label">Текст сообщения *</label>
            <textarea
              className="form-input"
              rows={6}
              value={config.payload || ''}
              onChange={(e) => onChange({ payload: e.target.value })}
              placeholder="Введите текст сообщения...&#10;Поддерживаются переменные: {username}, {chat_id}, {first_name}, {balance}"
            />
            <small className="form-hint">
              Поддерживается Markdown форматирование и переменные: {'{username}'}, {'{chat_id}'}, {'{first_name}'}, {'{balance}'}
            </small>
          </div>
        );

      case 'media':
        return (
          <div className="form-group">
            <label className="form-label">Тип медиа</label>
            <select
              className="form-select"
              value={config.media?.type || 'photo'}
              onChange={(e) =>
                onChange({
                  media: {
                    ...config.media,
                    type: e.target.value as MediaType,
                  } as any,
                })
              }
            >
              <option value="photo">Фото</option>
              <option value="video">Видео</option>
              <option value="audio">Аудио</option>
              <option value="document">Документ</option>
            </select>

            <div style={{ marginTop: '12px' }}>
              <label className="form-label">Загрузить файл</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <label className="btn btn--secondary" style={{ cursor: 'pointer' }}>
                  <FileImage size={16} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'photo')}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                  Фото
                </label>
                <label className="btn btn--secondary" style={{ cursor: 'pointer' }}>
                  <Video size={16} />
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileUpload(e, 'video')}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                  Видео
                </label>
                <label className="btn btn--secondary" style={{ cursor: 'pointer' }}>
                  <Music size={16} />
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleFileUpload(e, 'audio')}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                  Аудио
                </label>
                <label className="btn btn--secondary" style={{ cursor: 'pointer' }}>
                  <FileText size={16} />
                  <input
                    type="file"
                    onChange={(e) => handleFileUpload(e, 'document')}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                  Документ
                </label>
              </div>
            </div>

            {config.media?.url && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: 'var(--background-secondary)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                {config.media.type === 'photo' && (
                  <img
                    src={config.media.url}
                    alt="Preview"
                    style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: 'var(--radius-sm)' }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                    {config.media.type}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                    {config.media.url.substring(0, 50)}...
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ media: undefined })}
                  className="btn btn--danger btn--icon btn--sm"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div style={{ marginTop: '12px' }}>
              <label className="form-label">Или введите URL</label>
              <input
                type="url"
                className="form-input"
                value={config.media?.url || ''}
                onChange={(e) =>
                  onChange({
                    media: {
                      ...config.media,
                      url: e.target.value,
                      type: config.media?.type || 'photo',
                    } as any,
                  })
                }
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div style={{ marginTop: '12px' }}>
              <label className="form-label">Подпись (опционально)</label>
              <textarea
                className="form-input"
                rows={2}
                value={config.media?.caption || ''}
                onChange={(e) =>
                  onChange({
                    media: {
                      ...config.media,
                      caption: e.target.value,
                      type: config.media?.type || 'photo',
                    } as any,
                  })
                }
                placeholder="Подпись к медиа..."
              />
            </div>
          </div>
        );

      case 'url':
        return (
          <div className="form-group">
            <label className="form-label">URL *</label>
            <input
              type="url"
              className="form-input"
              value={config.payload || ''}
              onChange={(e) => onChange({ payload: e.target.value })}
              placeholder="https://example.com"
            />
            <small className="form-hint">
              URL должен начинаться с http:// или https://
            </small>
          </div>
        );

      case 'function':
        return (
          <div className="form-group">
            <label className="form-label">Тип функции</label>
            <select
              className="form-select"
              value={config.function?.type || 'webhook'}
              onChange={(e) =>
                onChange({
                  function: {
                    ...config.function,
                    type: e.target.value as 'webhook' | 'script' | 'internal',
                  } as FunctionConfig,
                })
              }
            >
              <option value="webhook">Webhook</option>
              <option value="script">Скрипт</option>
              <option value="internal">Внутренняя функция</option>
            </select>

            {config.function?.type === 'webhook' && (
              <>
                <div style={{ marginTop: '12px' }}>
                  <label className="form-label">URL Webhook *</label>
                  <input
                    type="url"
                    className="form-input"
                    value={config.function?.url || ''}
                    onChange={(e) =>
                      onChange({
                        function: {
                          ...config.function,
                          url: e.target.value,
                          type: 'webhook',
                        } as FunctionConfig,
                      })
                    }
                    placeholder="https://hooks.example.com/webhook"
                  />
                </div>
                <div style={{ marginTop: '12px' }}>
                  <label className="form-label">Тайм-аут (секунды)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={config.function?.timeout || 30}
                    onChange={(e) =>
                      onChange({
                        function: {
                          ...config.function,
                          timeout: parseInt(e.target.value) || 30,
                          type: 'webhook',
                        } as FunctionConfig,
                      })
                    }
                    min="1"
                    max="300"
                  />
                </div>
              </>
            )}

            {config.function?.type === 'script' && (
              <div style={{ marginTop: '12px' }}>
                <label className="form-label">Код скрипта *</label>
                <textarea
                  className="form-input"
                  rows={12}
                  value={config.function?.script || ''}
                  onChange={(e) =>
                    onChange({
                      function: {
                        ...config.function,
                        script: e.target.value,
                        type: 'script',
                      } as FunctionConfig,
                    })
                  }
                  placeholder={`// Пример: Персонализированная статистика
function handleCommand(userId, chatId, commandData) {
  const user = getUserById(userId);
  
  const message = \`Привет, \${user.firstName || user.username || 'Друг'}!
  
💰 Твой баланс: \${user.balance || 0} USDT
✅ Выполнено заданий: \${user.tasksCompleted || 0}\`;
  
  return {
    success: true,
    message: message,
    action: 'send_message'
  };
}

// Доступные переменные:
// - user: объект с данными пользователя
// - userId: Telegram ID пользователя
// - chatId: ID чата
// - commandData: данные команды (name, description)`}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 'var(--font-size-sm)',
                    width: '100%',
                    minWidth: 0,
                    maxWidth: '100%',
                    resize: 'vertical',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre',
                    boxSizing: 'border-box',
                  }}
                />
                <small className="form-hint">
                  Скрипт должен возвращать объект с полями: success (boolean), message (string), action (string)
                </small>
              </div>
            )}

            {config.function?.type === 'internal' && (
              <div style={{ marginTop: '12px' }}>
                <label className="form-label">Название внутренней функции *</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.function?.function_name || ''}
                  onChange={(e) =>
                    onChange({
                      function: {
                        ...config.function,
                        function_name: e.target.value,
                        type: 'internal',
                      } as FunctionConfig,
                    })
                  }
                  placeholder="sendBalance, sendTasks, sendRankInfo..."
                />
                <small className="form-hint">
                  Название внутренней функции бота (например: sendBalance, sendTasks)
                </small>
              </div>
            )}
          </div>
        );

      case 'command':
        return (
          <div className="form-group">
            <label className="form-label">Команда *</label>
            <input
              type="text"
              className="form-input"
              value={config.payload || ''}
              onChange={(e) => onChange({ payload: e.target.value })}
              placeholder="/start, /help, /balance..."
            />
            <small className="form-hint">
              Команда должна начинаться с / (например: /start, /help)
            </small>
          </div>
        );

      default:
        return null;
    }
  };

  // Force re-render check
  if (!config || !config.mode) {
    console.error('CommandModeConfigPanel: invalid config', config);
    return <div>Ошибка: неверная конфигурация</div>;
  }

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Режим команды *</label>
        <select
          className="form-select"
          value={config.mode}
          onChange={(e) => {
            const newMode = e.target.value as CommandMode;
            // Reset config when mode changes
            onChange({
              mode: newMode,
              payload: newMode === 'text' ? config.payload : undefined,
              media: newMode === 'media' ? config.media : undefined,
              function: newMode === 'function' ? config.function : undefined,
            });
          }}
        >
          <option value="text">Текст</option>
          <option value="media">Медиа</option>
          <option value="url">URL</option>
          <option value="function">Функция (Webhook/Скрипт)</option>
          <option value="command">Другая команда</option>
        </select>
        <small className="form-hint">
          Выберите режим работы команды
        </small>
      </div>

      {renderModeConfig()}
    </div>
  );
}

