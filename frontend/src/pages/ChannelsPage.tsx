import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Radio, Plus, Edit, Trash2, X, Power, CheckCircle, XCircle, ExternalLink, LayoutGrid, LayoutList } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSyncRefetch } from '../hooks/useSync';

interface Channel {
  id: string;
  channel_id: string;
  title: string;
  username?: string;
  url?: string;
  is_active: boolean;
  order: number;
  created_at: string;
}

export function ChannelsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  
  const [formData, setFormData] = useState({
    channel_id: '',
    title: '',
    username: '',
    url: '',
    is_active: true,
  });

  // Fetch channels
  const { data, isLoading, refetch } = useQuery<Channel[]>({
    queryKey: ['channels'],
    queryFn: async () => {
      const response = await api.get('/channels');
      return response.data;
    },
  });

  // Auto-refresh on sync events
  useSyncRefetch(['channels.created', 'channels.updated', 'channels.deleted'], refetch);

  const channels = data || [];

  // Create channel
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post('/channels', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      handleCloseModal();
      toast.success('✅ Канал добавлен!');
    },
    onError: (err: any) => {
      toast.error(`❌ Ошибка: ${err.response?.data?.message || err.message}`);
    },
  });

  // Update channel
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return api.put(`/channels/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      handleCloseModal();
      toast.success('✅ Канал обновлен!');
    },
    onError: (err: any) => {
      toast.error(`❌ Ошибка: ${err.response?.data?.message || err.message}`);
    },
  });

  // Delete channel
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/channels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('🗑️ Канал удален!');
    },
    onError: (err: any) => {
      toast.error(`❌ Ошибка: ${err.response?.data?.message || err.message}`);
    },
  });

  // Toggle active
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/channels/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('🔄 Статус изменен!');
    },
    onError: (err: any) => {
      toast.error(`❌ Ошибка: ${err.response?.data?.message || err.message}`);
    },
  });

  const handleOpenModal = () => {
    setEditingChannel(null);
    setFormData({
      channel_id: '',
      title: '',
      username: '',
      url: '',
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEditChannel = (channel: Channel) => {
    setEditingChannel(channel);
    setFormData({
      channel_id: channel.channel_id,
      title: channel.title,
      username: channel.username || '',
      url: channel.url || '',
      is_active: channel.is_active,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingChannel(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingChannel) {
      updateMutation.mutate({ id: editingChannel.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (channel: Channel) => {
    if (window.confirm(`Удалить канал "${channel.title}"?`)) {
      deleteMutation.mutate(channel.id);
    }
  };

  const activeChannelsCount = channels.filter(ch => ch.is_active).length;

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-section">
            <h1 className="page-title">Каналы</h1>
            <p className="page-subtitle">Управление обязательной подпиской</p>
          </div>
        </div>
        
        <div className="loading">
          <div className="loading-skeleton" style={{ height: '200px', marginBottom: '16px' }}></div>
          <div className="loading-skeleton" style={{ height: '200px', marginBottom: '16px' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Page Header */}
      <header className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Каналы</h1>
          <p className="page-subtitle">Управление обязательной подпиской на каналы</p>
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
            Добавить канал
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card stat-card--info">
          <div className="stat-card__icon">
            <Radio size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{channels.length}</div>
            <div className="stat-card__label">Всего каналов</div>
          </div>
        </div>
        
        <div className="stat-card stat-card--success">
          <div className="stat-card__icon">
            <CheckCircle size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{activeChannelsCount}</div>
            <div className="stat-card__label">Активных</div>
          </div>
        </div>
        
        <div className="stat-card stat-card--warning">
          <div className="stat-card__icon">
            <XCircle size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{channels.length - activeChannelsCount}</div>
            <div className="stat-card__label">Неактивных</div>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {activeChannelsCount > 0 && (
        <div className="alert alert--success" style={{ marginBottom: '24px' }}>
          <CheckCircle size={20} />
          <div>
            <strong>Обязательная подписка активна</strong>
            <p>Активных каналов: {activeChannelsCount}. Пользователи должны подписаться перед использованием бота.</p>
          </div>
        </div>
      )}

      {channels.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon">
            <Radio size={64} />
          </div>
          <h3 className="empty-state__title">Каналы не добавлены</h3>
          <p className="empty-state__description">
            Добавьте первый канал для обязательной подписки
          </p>
          <button onClick={handleOpenModal} className="btn btn--primary" style={{ marginTop: '16px' }}>
            <Plus size={16} />
            Добавить канал
          </button>
        </div>
      )}

      {/* View Modes */}
      {channels.length > 0 && viewMode === 'table' && (
        <div className="table-responsive">
          <div className="table-container">
            <table className="table">
              <thead className="table__head">
                <tr>
                  <th className="table__cell">Канал</th>
                  <th className="table__cell">ID / Username</th>
                  <th className="table__cell">Ссылка</th>
                  <th className="table__cell table__cell--center">Статус</th>
                  <th className="table__cell table__cell--center">Действия</th>
                </tr>
              </thead>
              <tbody className="table__body">
                {channels.map((channel) => (
                  <tr key={channel.id} className="table__row">
                    <td className="table__cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {channel.is_active ? (
                          <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                        ) : (
                          <XCircle size={18} style={{ color: 'var(--text-tertiary)' }} />
                        )}
                        <strong>{channel.title}</strong>
                      </div>
                    </td>
                    <td className="table__cell">
                      <code style={{ 
                        background: 'var(--bg-tertiary)', 
                        padding: '2px 8px', 
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}>
                        {channel.channel_id}
                      </code>
                    </td>
                    <td className="table__cell">
                      {channel.url ? (
                        <a
                          href={channel.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ 
                            color: 'var(--accent)', 
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <ExternalLink size={14} />
                          Открыть
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </td>
                    <td className="table__cell table__cell--center">
                      {channel.is_active ? (
                        <span className="badge badge--success">Активен</span>
                      ) : (
                        <span className="badge badge--secondary">Неактивен</span>
                      )}
                    </td>
                    <td className="table__cell table__cell--center">
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => toggleMutation.mutate(channel.id)}
                          className={`btn btn--sm ${channel.is_active ? 'btn--warning' : 'btn--success'}`}
                          title={channel.is_active ? 'Деактивировать' : 'Активировать'}
                        >
                          <Power size={16} />
                        </button>
                        <button
                          onClick={() => handleEditChannel(channel)}
                          className="btn btn--sm btn--secondary"
                          title="Редактировать"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(channel)}
                          className="btn btn--sm btn--danger"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {channels.length > 0 && viewMode === 'cards' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {channels.map((channel) => (
            <div key={channel.id} className="card" style={{ 
              borderLeft: channel.is_active ? '3px solid var(--success)' : '3px solid var(--border)',
              padding: '20px'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    {channel.is_active ? (
                      <CheckCircle size={20} style={{ color: 'var(--success)' }} />
                    ) : (
                      <XCircle size={20} style={{ color: 'var(--text-tertiary)' }} />
                    )}
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{channel.title}</h3>
                  </div>
                  <code style={{ 
                    background: 'var(--bg-tertiary)', 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    display: 'inline-block'
                  }}>
                    {channel.channel_id}
                  </code>
                </div>
                <button
                  onClick={() => toggleMutation.mutate(channel.id)}
                  className={`btn btn--icon btn--sm ${channel.is_active ? 'btn--success' : 'btn--secondary'}`}
                  title={channel.is_active ? 'Деактивировать' : 'Активировать'}
                >
                  <Power size={16} />
                </button>
              </div>

              {/* Link */}
              {channel.url && (
                <a
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    color: 'var(--accent)', 
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.875rem',
                    marginBottom: '16px'
                  }}
                >
                  <ExternalLink size={14} />
                  Открыть канал
                </a>
              )}

              {/* Status Badge */}
              <div style={{ marginBottom: '16px' }}>
                {channel.is_active ? (
                  <span className="badge badge--success">Активен</span>
                ) : (
                  <span className="badge badge--secondary">Неактивен</span>
                )}
              </div>

              {/* Actions */}
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                paddingTop: '16px',
                borderTop: '1px solid var(--border)'
              }}>
                <button
                  onClick={() => handleEditChannel(channel)}
                  className="btn btn--secondary btn--sm"
                  style={{ flex: 1 }}
                >
                  <Edit size={16} />
                  Изменить
                </button>
                <button
                  onClick={() => handleDelete(channel)}
                  className="btn btn--danger btn--sm"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Card */}
      {channels.length > 0 && (
        <div className="alert alert--info" style={{ marginTop: '24px' }}>
          <Radio size={20} />
          <div>
            <strong>Как это работает</strong>
            <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '0.875rem' }}>
              <li>Добавьте каналы для обязательной подписки</li>
              <li>Включите каналы переключателем</li>
              <li>Пользователи должны подписаться перед использованием бота</li>
              <li>Бот проверит подписку через Telegram API</li>
              <li><strong>⚠️ Бот должен быть админом в канале!</strong></li>
            </ul>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">
                {editingChannel ? 'Редактировать канал' : 'Добавить канал'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="btn btn--secondary btn--icon btn--sm"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal__body">
              <div className="form-group">
                <label className="form-label">
                  Username или ID канала <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="@channelname или -1001234567890"
                  value={formData.channel_id}
                  onChange={(e) => setFormData({ ...formData, channel_id: e.target.value })}
                  className="form-input"
                />
                <p className="form-hint">
                  Для публичных: @username. Для приватных: ID (начинается с -100)
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Название канала <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Мой канал"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ссылка (опционально)</label>
                <input
                  type="text"
                  placeholder="https://t.me/channelname"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="form-input"
                />
                <p className="form-hint">
                  Если не указано, будет сгенерирована автоматически
                </p>
              </div>

              <div className="form-group">
                <label className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span>Активен (проверять подписку)</span>
                </label>
              </div>

              <div className="modal__footer">
                <button type="button" onClick={handleCloseModal} className="btn btn--secondary">
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn btn--primary"
                >
                  {editingChannel ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
