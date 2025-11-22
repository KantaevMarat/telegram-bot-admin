import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commandsApi } from '../api/client';
import { Terminal, Plus, Edit, Trash2, X, LayoutGrid, LayoutList, List } from 'lucide-react';
import toast from 'react-hot-toast';
import CommandModeConfigPanel, { CommandConfig, CommandMode } from '../components/commands/CommandModeConfigPanel';

interface Command {
  id: string;
  name: string;
  description: string;
  response?: string;
  media_url?: string;
  action_type?: string;
  action_payload?: any;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export default function CommandsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingCommand, setEditingCommand] = useState<Command | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'list' | 'cards'>('table');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true,
  });

  const [commandConfig, setCommandConfig] = useState<CommandConfig>({
    mode: 'text',
    payload: '',
  });

  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['commands'],
    queryFn: () => commandsApi.getCommands(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => commandsApi.createCommand(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commands'] });
      handleCloseModal();
      toast.success('Команда создана!');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => commandsApi.updateCommand(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commands'] });
      handleCloseModal();
      toast.success('Команда обновлена!');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => commandsApi.deleteCommand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commands'] });
      toast.success('Команда удалена!');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  const handleOpenModal = () => {
    setEditingCommand(null);
    setFormData({
      name: '',
      description: '',
      active: true,
    });
    setCommandConfig({
      mode: 'text',
      payload: '',
    });
    setShowModal(true);
  };

  const handleEditCommand = (command: Command) => {
    setEditingCommand(command);
    setFormData({
      name: command.name,
      description: command.description,
      active: command.active,
    });

    // Parse command config from action_type and action_payload
    let config: CommandConfig = {
      mode: (command.action_type as CommandMode) || 'text',
      payload: '',
    };

    if (command.action_type && command.action_payload) {
      config.mode = command.action_type as CommandMode;
      
      if (command.action_type === 'text') {
        config.payload = command.action_payload.text || command.response || '';
      } else if (command.action_type === 'media') {
        config.media = {
          type: command.action_payload.media_type || 'photo',
          url: command.action_payload.media_url || command.media_url || '',
          caption: command.action_payload.caption || '',
        };
        config.payload = command.action_payload.text || '';
      } else if (command.action_type === 'url') {
        config.payload = command.action_payload.url || '';
      } else if (command.action_type === 'function') {
        config.function = command.action_payload;
      } else if (command.action_type === 'command') {
        config.payload = command.action_payload.command || '';
      } else if (command.action_type === 'built_in') {
        // For built-in commands, use text mode with response
        config.mode = 'text';
        config.payload = command.response || '';
      }
    } else {
      // Legacy format: use response and media_url
      config.mode = command.media_url ? 'media' : 'text';
      config.payload = command.response || '';
      if (command.media_url) {
        config.media = {
          type: 'photo',
          url: command.media_url,
        };
      }
    }

    setCommandConfig(config);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCommand(null);
    setFormData({
      name: '',
      description: '',
      active: true,
    });
    setCommandConfig({
      mode: 'text',
      payload: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 handleSubmit called', { formData, commandConfig });
    
    if (!formData.name.trim()) {
      toast.error('Введите название команды');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Введите описание команды');
      return;
    }

    // Build action_payload based on mode
    let action_payload: any = {};
    let response: string | undefined;
    let media_url: string | undefined;

    console.log('🔍 commandConfig.mode:', commandConfig.mode, 'commandConfig:', commandConfig);

    switch (commandConfig.mode) {
      case 'text':
        if (!commandConfig.payload?.trim()) {
          toast.error('Введите текст сообщения');
          return;
        }
        action_payload = { text: commandConfig.payload };
        response = commandConfig.payload; // For backward compatibility
        break;

      case 'media':
        if (!commandConfig.media?.url) {
          toast.error('Укажите URL медиафайла или загрузите файл');
          return;
        }
        action_payload = {
          text: commandConfig.payload || '',
          media_url: commandConfig.media.url,
          media_type: commandConfig.media.type,
          caption: commandConfig.media.caption || '',
        };
        response = commandConfig.payload || ''; // For backward compatibility
        media_url = commandConfig.media.url; // For backward compatibility
        break;

      case 'url':
        if (!commandConfig.payload?.trim()) {
          toast.error('Введите URL');
          return;
        }
        action_payload = { url: commandConfig.payload };
        break;

      case 'function':
        if (commandConfig.function?.type === 'webhook' && !commandConfig.function?.url) {
          toast.error('Введите URL webhook');
          return;
        }
        if (commandConfig.function?.type === 'script' && !commandConfig.function?.script) {
          toast.error('Введите код скрипта');
          return;
        }
        if (commandConfig.function?.type === 'internal' && !commandConfig.function?.function_name) {
          toast.error('Введите название внутренней функции');
          return;
        }
        action_payload = commandConfig.function;
        break;

      case 'command':
        if (!commandConfig.payload?.trim()) {
          toast.error('Введите команду');
          return;
        }
        action_payload = { command: commandConfig.payload };
        break;
    }
    
    const submitData: any = {
      name: formData.name.startsWith('/') ? formData.name : `/${formData.name}`,
      description: formData.description,
      // For built-in commands, preserve the original action_type
      action_type: (editingCommand?.action_type === 'built_in') ? 'built_in' : commandConfig.mode,
      // For built-in commands, preserve the original action_payload (built-in function identifier)
      action_payload: (editingCommand?.action_type === 'built_in') ? editingCommand.action_payload : action_payload,
      active: formData.active,
    };

    // For built-in commands, ALWAYS save response (this is their customizable text)
    if (editingCommand?.action_type === 'built_in') {
      submitData.response = response || '';
    } else if (response) {
      submitData.response = response;
    }
    
    if (media_url) submitData.media_url = media_url;

    console.log('🚀 Submitting data:', JSON.stringify(submitData, null, 2));

    if (editingCommand) {
      updateMutation.mutate({ id: editingCommand.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту команду?')) {
      deleteMutation.mutate(id);
    }
  };

  const commands = data || [];

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-section">
            <h1 className="page-title">Команды</h1>
            <p className="page-subtitle">Управление кастомными командами</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '48px' }}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Команды</h1>
          <p className="page-subtitle">Управление кастомными командами бота</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: '12px' }}>
          <div className="view-toggle">
            <button
              onClick={() => setViewMode('table')}
              className={`btn btn--secondary btn--sm btn--icon ${viewMode === 'table' ? 'btn--active' : ''}`}
              title="Табличный вид"
            >
              <LayoutList size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`btn btn--secondary btn--sm btn--icon ${viewMode === 'list' ? 'btn--active' : ''}`}
              title="Списочный вид"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`btn btn--secondary btn--sm btn--icon ${viewMode === 'cards' ? 'btn--active' : ''}`}
              title="Карточный вид"
            >
              <LayoutGrid size={18} />
            </button>
          </div>
          <button
            onClick={handleOpenModal}
            className="btn btn--primary"
          >
            <Plus size={16} />
            Добавить команду
          </button>
        </div>
      </header>

      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card stat-card--info">
          <div className="stat-card__icon">
            <Terminal size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{commands.length}</div>
            <div className="stat-card__label">Всего команд</div>
          </div>
        </div>
        
        <div className="stat-card stat-card--success">
          <div className="stat-card__icon">
            <Terminal size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{commands.filter(c => c.active).length}</div>
            <div className="stat-card__label">Активных</div>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Команда</th>
                <th>Описание</th>
                <th>Ответ</th>
                <th>Медиа</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {commands.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                    Нет команд. Создайте первую команду!
                  </td>
                </tr>
              ) : (
                commands.map((command) => (
                  <tr key={command.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          backgroundColor: 'var(--bg-secondary)',
                          fontFamily: 'monospace'
                        }}>
                          {command.name}
                        </code>
                        {command.action_type === 'built_in' && (
                          <span className="badge badge--warning" style={{ fontSize: '0.7rem' }}>
                            Встроенная
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{command.description}</td>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {command.action_type ? (
                        <span className="badge badge--info">{command.action_type}</span>
                      ) : (
                        command.response || '—'
                      )}
                    </td>
                    <td>
                      {command.action_type === 'media' || command.media_url ? (
                        <span className="badge badge--success">Есть</span>
                      ) : (
                        <span className="badge badge--default">Нет</span>
                      )}
                    </td>
                    <td>
                      {command.active ? (
                        <span className="badge badge--success">Активна</span>
                      ) : (
                        <span className="badge badge--error">Неактивна</span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => handleEditCommand(command)}
                          className="btn btn--secondary btn--icon btn--sm"
                          title="Редактировать"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(command.id)}
                          className="btn btn--danger btn--icon btn--sm"
                          title={command.action_type === 'built_in' ? 'Встроенные команды нельзя удалять' : 'Удалить'}
                          disabled={command.action_type === 'built_in'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'list' ? (
        <div className="users-list">
          {commands.length === 0 ? (
            <div className="empty-state">
              <Terminal size={48} />
              <p>Нет команд</p>
            </div>
          ) : (
            commands.map((command) => (
              <div key={command.id} className="user-card">
                <div className="user-card__header">
                  <div className="user-card__avatar">
                    <Terminal size={32} />
                  </div>
                  <div className="user-card__info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 className="user-card__name" style={{ margin: 0 }}>
                        <code style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          backgroundColor: 'var(--bg-secondary)',
                          fontFamily: 'monospace'
                        }}>
                          {command.name}
                        </code>
                      </h3>
                      {command.action_type === 'built_in' && (
                        <span className="badge badge--warning" style={{ fontSize: '0.65rem' }}>
                          Встроенная
                        </span>
                      )}
                    </div>
                    <p className="user-card__username">{command.description}</p>
                  </div>
                  <span className={`badge ${command.active ? 'badge--success' : 'badge--error'}`}>
                    {command.active ? 'Активна' : 'Неактивна'}
                  </span>
                </div>

                <div className="user-card__stats">
                  <div className="user-card__stat">
                    <Terminal size={16} />
                    <span className="user-card__stat-label">Тип:</span>
                    <span className="user-card__stat-value">
                      {command.action_type || 'text'}
                    </span>
                  </div>
                  {(command.action_type === 'media' || command.media_url) && (
                    <div className="user-card__stat">
                      <span className="user-card__stat-label">Медиа:</span>
                      <span className="badge badge--success">Есть</span>
                    </div>
                  )}
                </div>

                <div className="user-card__actions">
                  <button
                    onClick={() => handleEditCommand(command)}
                    className="btn btn--secondary btn--sm"
                    title="Редактировать"
                  >
                    <Edit size={16} />
                    Редактировать
                  </button>
                  <button
                    onClick={() => handleDelete(command.id)}
                    className="btn btn--danger btn--sm"
                    title={command.action_type === 'built_in' ? 'Встроенные команды нельзя удалять' : 'Удалить'}
                    disabled={command.action_type === 'built_in'}
                  >
                    <Trash2 size={16} />
                    Удалить
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="cards-grid">
          {commands.length === 0 ? (
            <div className="empty-state">
              <Terminal size={48} />
              <p>Нет команд</p>
            </div>
          ) : (
            commands.map((command) => (
              <div key={command.id} className="user-card">
                <div className="user-card__header">
                  <div className="user-card__avatar">
                    <Terminal size={32} />
                  </div>
                  <div className="user-card__info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 className="user-card__name" style={{ margin: 0 }}>
                        <code style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          backgroundColor: 'var(--bg-secondary)',
                          fontFamily: 'monospace'
                        }}>
                          {command.name}
                        </code>
                      </h3>
                      {command.action_type === 'built_in' && (
                        <span className="badge badge--warning" style={{ fontSize: '0.65rem' }}>
                          Встроенная
                        </span>
                      )}
                    </div>
                    <p className="user-card__username">{command.description}</p>
                  </div>
                  <span className={`badge ${command.active ? 'badge--success' : 'badge--error'}`}>
                    {command.active ? 'Активна' : 'Неактивна'}
                  </span>
                </div>

                <div className="user-card__stats">
                  <div className="user-card__stat">
                    <Terminal size={16} />
                    <span className="user-card__stat-label">Тип:</span>
                    <span className="user-card__stat-value">
                      {command.action_type || 'text'}
                    </span>
                  </div>
                  {(command.action_type === 'media' || command.media_url) && (
                    <div className="user-card__stat">
                      <span className="user-card__stat-label">Медиа:</span>
                      <span className="badge badge--success">Есть</span>
                    </div>
                  )}
                </div>

                <div className="user-card__actions">
                  <button
                    onClick={() => handleEditCommand(command)}
                    className="btn btn--secondary btn--sm"
                    title="Редактировать"
                  >
                    <Edit size={16} />
                    Редактировать
                  </button>
                  <button
                    onClick={() => handleDelete(command.id)}
                    className="btn btn--danger btn--sm"
                    title={command.action_type === 'built_in' ? 'Встроенные команды нельзя удалять' : 'Удалить'}
                    disabled={command.action_type === 'built_in'}
                  >
                    <Trash2 size={16} />
                    Удалить
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">
                {editingCommand ? 'Редактировать команду' : 'Создать команду'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="btn btn--secondary btn--icon btn--sm"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="modal__body">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Название команды *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="/mycommand"
                    required
                  />
                  <small className="form-hint" style={{ marginTop: '4px', display: 'block', color: 'var(--text-secondary)' }}>
                    Начинается с /. Например: /start, /help, /mycommand
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Описание *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Краткое описание команды"
                    required
                  />
                </div>

                {/* Command Mode Configuration Panel - NEW VERSION */}
                <CommandModeConfigPanel
                  config={commandConfig}
                  onChange={(updates) => setCommandConfig(prev => ({ ...prev, ...updates }))}
                />

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    />
                    <span>Активна</span>
                  </label>
                </div>

                <div className="modal__actions">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn btn--secondary"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingCommand ? 'Сохранить' : 'Создать'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





