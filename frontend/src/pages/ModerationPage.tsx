import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { tasksApi } from '../api/client';
import { CheckCircle, XCircle, Clock, Search, Filter, User, DollarSign, Calendar, MessageSquare, LayoutGrid, LayoutList, List } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSyncRefetch } from '../hooks/useSync';

interface UserTaskModeration {
  id: string;
  user_id: string;
  task_id: string;
  status: string;
  reward: number;
  started_at: string;
  submitted_at: string;
  completed_at: string | null;
  user: {
    id: string;
    tg_id: string;
    username: string;
    first_name: string;
    last_name: string;
  };
  task: {
    id: string;
    title: string;
    description: string;
    reward_min: number;
    reward_max: number;
  };
}

export default function ModerationPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'list' | 'cards'>('table');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: userTasks = [], isLoading, error, refetch } = useQuery({
    queryKey: ['tasks-moderation', statusFilter, searchQuery],
    queryFn: async () => {
      try {
        const result = await tasksApi.getPendingReview({ 
          status: statusFilter || undefined, 
          search: searchQuery || undefined 
        });
        console.log('✅ Moderation data loaded:', result);
        console.log('📊 Tasks by status:', {
          submitted: (result || []).filter((t: UserTaskModeration) => t.status === 'submitted').length,
          in_progress: (result || []).filter((t: UserTaskModeration) => t.status === 'in_progress').length,
          completed: (result || []).filter((t: UserTaskModeration) => t.status === 'completed').length,
          rejected: (result || []).filter((t: UserTaskModeration) => t.status === 'rejected').length,
        });
        return result || [];
      } catch (err: any) {
        console.error('❌ Error loading moderation data:', err);
        toast.error(`Ошибка загрузки: ${err.response?.data?.message || err.message}`);
        throw err;
      }
    },
  });

  // 🔄 Auto-refresh on sync events
  useSyncRefetch(['user_tasks.updated'], refetch);

  const approveMutation = useMutation({
    mutationFn: (userTaskId: string) => tasksApi.approveTask(userTaskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-moderation'] });
      toast.success('Задание одобрено!');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ userTaskId, reason }: { userTaskId: string; reason?: string }) => 
      tasksApi.rejectTask(userTaskId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-moderation'] });
      toast.success('Задание отклонено');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  const handleApprove = (userTaskId: string) => {
    if (confirm('Одобрить выполнение задания и начислить награду?')) {
      approveMutation.mutate(userTaskId);
    }
  };

  const handleReject = (userTaskId: string) => {
    const reason = prompt('Причина отклонения (необязательно):');
    if (reason !== null) {
      rejectMutation.mutate({ userTaskId, reason });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <span className="badge badge--warning"><Clock size={14} /> На проверке</span>;
      case 'in_progress':
        return <span className="badge badge--info"><Clock size={14} /> В процессе</span>;
      case 'completed':
        return <span className="badge badge--success"><CheckCircle size={14} /> Завершено</span>;
      case 'rejected':
        return <span className="badge badge--error"><XCircle size={14} /> Отклонено</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserDisplayName = (user: UserTaskModeration['user']) => {
    if (user.username) return `@${user.username}`;
    return `${user.first_name} ${user.last_name}`.trim() || `ID: ${user.tg_id}`;
  };

  const safeTasks = Array.isArray(userTasks) ? userTasks : [];
  const submittedTasks = safeTasks.filter((ut: UserTaskModeration) => ut.status === 'submitted');
  const inProgressTasks = safeTasks.filter((ut: UserTaskModeration) => ut.status === 'in_progress');

  if (isLoading) {
    return (
      <div className="page">
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Загрузка данных модерации...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <header className="page-header">
          <div>
            <h1 className="page-title">
              <Clock size={28} />
              Модерация заданий
            </h1>
            <p className="page-subtitle">Одобрение и отклонение выполненных заданий</p>
          </div>
        </header>
        <div style={{ 
          padding: '48px', 
          textAlign: 'center',
          background: 'var(--error-light)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--error)'
        }}>
          <XCircle size={48} style={{ color: 'var(--error)', marginBottom: '16px' }} />
          <h3 style={{ marginBottom: '8px', color: 'var(--error)' }}>Ошибка загрузки данных</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            {error instanceof Error ? error.message : 'Не удалось загрузить данные модерации'}
          </p>
          <button 
            onClick={() => refetch()} 
            className="btn btn--primary"
          >
            Повторить попытку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">
            Модерация заданий
          </h1>
          <p className="page-subtitle">Одобрение и отклонение выполненных заданий</p>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card stat-card--warning">
          <div className="stat-card__icon">
            <Clock size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{submittedTasks.length}</div>
            <div className="stat-card__label">На проверке</div>
          </div>
        </div>
        
        <div className="stat-card stat-card--info">
          <div className="stat-card__icon">
            <Clock size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{inProgressTasks.length}</div>
            <div className="stat-card__label">В процессе</div>
          </div>
        </div>

        <div className="stat-card stat-card--success">
          <div className="stat-card__icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">
              {submittedTasks.reduce((sum: number, ut: UserTaskModeration) => {
                const reward = parseFloat(String(ut.reward || 0));
                return sum + (isNaN(reward) ? 0 : reward);
              }, 0).toFixed(2)}
            </div>
            <div className="stat-card__label">К выплате (USDT)</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="search-input" style={{ flex: 1, minWidth: '200px' }}>
          <Search size={18} className="search-input__icon" />
          <input
            type="text"
            className="search-input__field"
            placeholder="Поиск по username или ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={18} />
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ minWidth: '200px' }}
          >
            <option value="">Все статусы</option>
            <option value="submitted">На проверке</option>
            <option value="in_progress">В процессе</option>
            <option value="completed">Завершено</option>
            <option value="rejected">Отклонено</option>
          </select>
        </div>

        <div className="view-toggle" style={{ display: 'flex', gap: '4px' }}>
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
      </div>

      {/* Tasks Display */}
      {viewMode === 'table' ? (
      <div className="table-responsive">
        <div className="table-container">
          <table className="table">
            <thead className="table__head">
              <tr>
                <th className="table__cell">Пользователь</th>
                <th className="table__cell">Задание</th>
                <th className="table__cell table__cell--center">Награда</th>
                <th className="table__cell">Начато</th>
                <th className="table__cell">Отправлено</th>
                <th className="table__cell table__cell--center">Статус</th>
                <th className="table__cell table__cell--center">Действия</th>
              </tr>
            </thead>
            <tbody className="table__body">
              {safeTasks.length === 0 ? (
                <tr className="table__row">
                  <td colSpan={7} className="table__cell table__cell--empty">
                    Нет заданий для модерации
                  </td>
                </tr>
              ) : (
                safeTasks.map((userTask: UserTaskModeration) => (
                  <tr key={userTask.id} className="table__row">
                    <td className="table__cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%',
                          background: 'var(--accent-light)',
                          color: 'var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <User size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>
                            {getUserDisplayName(userTask.user)}
                          </div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                            ID: {userTask.user.tg_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table__cell">
                      <div>
                        <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-primary)', marginBottom: '4px' }}>
                          {userTask.task.title}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          {userTask.task.description.length > 80 
                            ? `${userTask.task.description.slice(0, 80)}...` 
                            : userTask.task.description}
                        </div>
                        {userTask.status === 'submitted' && (
                          <div style={{ 
                            fontSize: 'var(--font-size-xs)', 
                            color: 'var(--warning)', 
                            fontWeight: 'var(--font-weight-semibold)',
                            marginTop: '4px',
                            padding: '4px 8px',
                            background: 'var(--warning-light)',
                            borderRadius: '4px',
                            display: 'inline-block',
                            border: '1px solid var(--warning)'
                          }}>
                            ⏳ ТРЕБУЕТ МОДЕРАЦИИ
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table__cell table__cell--center">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                        <DollarSign size={14} style={{ color: 'var(--success)' }} />
                        <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--success)' }}>
                          {(() => {
                            const reward = parseFloat(String(userTask.reward || 0));
                            return (isNaN(reward) ? 0 : reward).toFixed(2);
                          })()}
                        </span>
                      </div>
                    </td>
                    <td className="table__cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                          {formatDate(userTask.started_at)}
                        </span>
                      </div>
                    </td>
                    <td className="table__cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                          {formatDate(userTask.submitted_at)}
                        </span>
                      </div>
                    </td>
                    <td className="table__cell table__cell--center">
                      {getStatusBadge(userTask.status)}
                    </td>
                    <td className="table__cell table__cell--center">
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Кнопка перехода к чату */}
                        <button
                          onClick={() => navigate(`/chats?user=${userTask.user_id}`)}
                          className="btn btn--secondary btn--sm"
                          title="Открыть чат с пользователем"
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            padding: '6px 12px',
                            fontSize: 'var(--font-size-sm)'
                          }}
                        >
                          <MessageSquare size={16} />
                          <span>Чат</span>
                        </button>
                        
                        {/* Кнопки одобрения/отклонения - всегда показываем для submitted, для других статусов показываем, но disabled */}
                        {userTask.status === 'submitted' ? (
                          <>
                            <button
                              onClick={() => {
                                console.log('🔵 Approve button clicked for task:', userTask.id, userTask.status);
                                handleApprove(userTask.id);
                              }}
                              className="btn btn--success btn--sm"
                              title="Одобрить задание и начислить награду"
                              disabled={approveMutation.isPending}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                padding: '6px 12px',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 'var(--font-weight-medium)'
                              }}
                            >
                              <CheckCircle size={16} />
                              <span>{approveMutation.isPending ? 'Одобрение...' : 'Одобрить'}</span>
                            </button>
                            <button
                              onClick={() => {
                                console.log('🔴 Reject button clicked for task:', userTask.id, userTask.status);
                                handleReject(userTask.id);
                              }}
                              className="btn btn--danger btn--sm"
                              title="Отклонить задание"
                              disabled={rejectMutation.isPending}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                padding: '6px 12px',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 'var(--font-weight-medium)'
                              }}
                            >
                              <XCircle size={16} />
                              <span>{rejectMutation.isPending ? 'Отклонение...' : 'Отклонить'}</span>
                            </button>
                          </>
                        ) : userTask.status === 'in_progress' ? (
                          <div style={{ 
                            fontSize: 'var(--font-size-xs)', 
                            color: 'var(--text-secondary)',
                            padding: '8px 12px',
                            background: 'var(--background-secondary)',
                            borderRadius: '4px'
                          }}>
                            ⏳ Ожидает отправки
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      ) : viewMode === 'list' ? (
        <div className="users-list">
          {isLoading ? (
            <div className="loading">Загрузка...</div>
          ) : safeTasks.length === 0 ? (
            <div className="empty-state">
              <Clock size={48} />
              <p>Нет заданий для модерации</p>
            </div>
          ) : (
            safeTasks.map((userTask: UserTaskModeration) => (
              <div key={userTask.id} className="user-card">
                <div className="user-card__header">
                  <div className="user-card__avatar">
                    <User size={32} />
                  </div>
                  <div className="user-card__info">
                    <h3 className="user-card__name">{getUserDisplayName(userTask.user)}</h3>
                    <p className="user-card__username">ID: {userTask.user.tg_id}</p>
                  </div>
                  {getStatusBadge(userTask.status)}
                </div>

                <div className="user-card__stats">
                  <div className="user-card__stat">
                    <Clock size={16} />
                    <span className="user-card__stat-label">Задание:</span>
                    <span className="user-card__stat-value">{userTask.task.title}</span>
                  </div>
                  <div className="user-card__stat">
                    <DollarSign size={16} />
                    <span className="user-card__stat-label">Награда:</span>
                    <span className="user-card__stat-value">
                      {(() => {
                        const reward = parseFloat(String(userTask.reward || 0));
                        return (isNaN(reward) ? 0 : reward).toFixed(2);
                      })()} USDT
                    </span>
                  </div>
                  <div className="user-card__stat">
                    <Calendar size={16} />
                    <span className="user-card__stat-label">Отправлено:</span>
                    <span className="user-card__stat-value">{formatDate(userTask.submitted_at)}</span>
                  </div>
                </div>

                <div className="user-card__meta">
                  <span className="user-card__meta-item">{userTask.task.description.length > 60 ? `${userTask.task.description.slice(0, 60)}...` : userTask.task.description}</span>
                </div>

                <div className="user-card__actions">
                  <button
                    onClick={() => navigate(`/chats?user=${userTask.user_id}`)}
                    className="btn btn--secondary btn--sm"
                    title="Открыть чат с пользователем"
                  >
                    <MessageSquare size={16} />
                    Чат
                  </button>
                  {(userTask.status === 'submitted' || userTask.status === 'in_progress') && (
                    <>
                      <button
                        onClick={() => handleApprove(userTask.id)}
                        className="btn btn--success btn--sm"
                        title="Одобрить задание"
                        disabled={approveMutation.isPending || userTask.status !== 'submitted'}
                        style={{
                          opacity: userTask.status === 'submitted' ? 1 : 0.6,
                          fontWeight: 'var(--font-weight-semibold)'
                        }}
                      >
                        <CheckCircle size={16} />
                        ✅ Одобрить
                      </button>
                      <button
                        onClick={() => handleReject(userTask.id)}
                        className="btn btn--danger btn--sm"
                        title="Отклонить задание"
                        disabled={rejectMutation.isPending || userTask.status !== 'submitted'}
                        style={{
                          opacity: userTask.status === 'submitted' ? 1 : 0.6,
                          fontWeight: 'var(--font-weight-semibold)'
                        }}
                      >
                        <XCircle size={16} />
                        ❌ Отклонить
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="cards-grid">
          {isLoading ? (
            <div className="loading">Загрузка...</div>
          ) : safeTasks.length === 0 ? (
            <div className="empty-state">
              <Clock size={48} />
              <p>Нет заданий для модерации</p>
            </div>
          ) : (
            safeTasks.map((userTask: UserTaskModeration) => (
              <div key={userTask.id} className="user-card">
                <div className="user-card__header">
                  <div className="user-card__avatar">
                    <User size={32} />
                  </div>
                  <div className="user-card__info">
                    <h3 className="user-card__name">{getUserDisplayName(userTask.user)}</h3>
                    <p className="user-card__username">ID: {userTask.user.tg_id}</p>
                  </div>
                  {getStatusBadge(userTask.status)}
                </div>

                <div className="user-card__stats">
                  <div className="user-card__stat">
                    <Clock size={16} />
                    <span className="user-card__stat-label">Задание:</span>
                    <span className="user-card__stat-value">{userTask.task.title}</span>
                  </div>
                  <div className="user-card__stat">
                    <DollarSign size={16} />
                    <span className="user-card__stat-label">Награда:</span>
                    <span className="user-card__stat-value">
                      {(() => {
                        const reward = parseFloat(String(userTask.reward || 0));
                        return (isNaN(reward) ? 0 : reward).toFixed(2);
                      })()} USDT
                    </span>
                  </div>
                  <div className="user-card__stat">
                    <Calendar size={16} />
                    <span className="user-card__stat-label">Отправлено:</span>
                    <span className="user-card__stat-value">{formatDate(userTask.submitted_at)}</span>
                  </div>
                </div>

                <div className="user-card__meta">
                  <span className="user-card__meta-item">{userTask.task.description.length > 60 ? `${userTask.task.description.slice(0, 60)}...` : userTask.task.description}</span>
                </div>

                <div className="user-card__actions">
                  <button
                    onClick={() => navigate(`/chats?user=${userTask.user_id}`)}
                    className="btn btn--secondary btn--sm"
                    title="Открыть чат с пользователем"
                  >
                    <MessageSquare size={16} />
                    Чат
                  </button>
                  {(userTask.status === 'submitted' || userTask.status === 'in_progress') && (
                    <>
                      <button
                        onClick={() => handleApprove(userTask.id)}
                        className="btn btn--success btn--sm"
                        title="Одобрить задание"
                        disabled={approveMutation.isPending || userTask.status !== 'submitted'}
                        style={{
                          opacity: userTask.status === 'submitted' ? 1 : 0.6,
                          fontWeight: 'var(--font-weight-semibold)'
                        }}
                      >
                        <CheckCircle size={16} />
                        ✅ Одобрить
                      </button>
                      <button
                        onClick={() => handleReject(userTask.id)}
                        className="btn btn--danger btn--sm"
                        title="Отклонить задание"
                        disabled={rejectMutation.isPending || userTask.status !== 'submitted'}
                        style={{
                          opacity: userTask.status === 'submitted' ? 1 : 0.6,
                          fontWeight: 'var(--font-weight-semibold)'
                        }}
                      >
                        <XCircle size={16} />
                        ❌ Отклонить
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

