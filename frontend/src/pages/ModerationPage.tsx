import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/client';
import { CheckCircle, XCircle, Clock, Search, Filter, User, DollarSign, Calendar } from 'lucide-react';
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
  const queryClient = useQueryClient();

  const { data: userTasks = [], isLoading, refetch } = useQuery({
    queryKey: ['tasks-moderation', statusFilter, searchQuery],
    queryFn: () => tasksApi.getPendingReview({ 
      status: statusFilter || undefined, 
      search: searchQuery || undefined 
    }),
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

  const submittedTasks = userTasks.filter((ut: UserTaskModeration) => ut.status === 'submitted');
  const inProgressTasks = userTasks.filter((ut: UserTaskModeration) => ut.status === 'in_progress');

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

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
              {submittedTasks.reduce((sum: number, ut: UserTaskModeration) => sum + (ut.reward || 0), 0).toFixed(2)}
            </div>
            <div className="stat-card__label">К выплате (USDT)</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div className="search-input" style={{ flex: 1 }}>
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
      </div>

      {/* Tasks Table */}
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
              {userTasks.length === 0 ? (
                <tr className="table__row">
                  <td colSpan={7} className="table__cell table__cell--empty">
                    Нет заданий для модерации
                  </td>
                </tr>
              ) : (
                userTasks.map((userTask: UserTaskModeration) => (
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
                        <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-primary)' }}>
                          {userTask.task.title}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {userTask.task.description.length > 60 
                            ? `${userTask.task.description.slice(0, 60)}...` 
                            : userTask.task.description}
                        </div>
                      </div>
                    </td>
                    <td className="table__cell table__cell--center">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                        <DollarSign size={14} style={{ color: 'var(--success)' }} />
                        <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--success)' }}>
                          {userTask.reward?.toFixed(2) || '0.00'}
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
                      {userTask.status === 'submitted' && (
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleApprove(userTask.id)}
                            className="btn btn--success btn--icon btn--sm"
                            title="Одобрить"
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle size={14} />
                          </button>
                          <button
                            onClick={() => handleReject(userTask.id)}
                            className="btn btn--danger btn--icon btn--sm"
                            title="Отклонить"
                            disabled={rejectMutation.isPending}
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

