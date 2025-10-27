import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/client';
import { CheckSquare, Plus, Edit, Trash2, X, Upload, TrendingUp, DollarSign, Check, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  description: string;
  reward_min: number;
  reward_max: number;
  action_url?: string;
  media_url?: string;
  channel_id?: string;
  task_type?: string;
  active: boolean;
  completions_count: number;
}

export default function TasksPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reward_min: 0,
    reward_max: 0,
    action_url: '',
    media_url: '',
    channel_id: '',
    task_type: 'subscription',
    active: true,
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.getTasks(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => tasksApi.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      handleCloseModal();
      toast.success('Задание создано!');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tasksApi.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      handleCloseModal();
      toast.success('Задание обновлено!');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Задание удалено!');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  const handleOpenModal = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      reward_min: 0,
      reward_max: 0,
      action_url: '',
      media_url: '',
      channel_id: '',
      task_type: 'subscription',
      active: true,
    });
    setShowModal(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      reward_min: task.reward_min,
      reward_max: task.reward_max,
      action_url: task.action_url || '',
      media_url: task.media_url || '',
      channel_id: task.channel_id || '',
      task_type: task.task_type || 'subscription',
      active: task.active,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      reward_min: 0,
      reward_max: 0,
      action_url: '',
      media_url: '',
      channel_id: '',
      task_type: 'subscription',
      active: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить это задание?')) {
      deleteMutation.mutate(id);
    }
  };

  const tasks = data || [];

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-section">
            <h1 className="page-title">Задания</h1>
            <p className="page-subtitle">Управление заданиями для пользователей</p>
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
          <h1 className="page-title">Задания</h1>
          <p className="page-subtitle">Управление заданиями для пользователей</p>
        </div>
        <div className="page-actions">
          <button
            onClick={handleOpenModal}
            className="btn btn--primary"
          >
            <Plus size={16} />
            Добавить задание
          </button>
        </div>
      </header>

      {/* Statistics */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card stat-card--info">
          <div className="stat-card__icon">
            <CheckSquare size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{tasks.length}</div>
            <div className="stat-card__label">Всего заданий</div>
          </div>
        </div>
        
        <div className="stat-card stat-card--success">
          <div className="stat-card__icon">
            <CheckSquare size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{tasks.filter(t => t.active).length}</div>
            <div className="stat-card__label">Активных</div>
          </div>
        </div>
        
        <div className="stat-card stat-card--warning">
          <div className="stat-card__icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">
              {tasks.reduce((sum, task) => sum + (task.completions_count || 0), 0)}
            </div>
            <div className="stat-card__label">Выполнений</div>
          </div>
        </div>
        
        <div className="stat-card stat-card--primary">
          <div className="stat-card__icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">
              ${tasks.reduce((sum, task) => sum + ((task.reward_max || 0) * (task.completions_count || 0)), 0).toFixed(2)}
            </div>
            <div className="stat-card__label">Выплачено</div>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="table-responsive">
        <div className="table-container">
          <table className="table">
          <thead className="table__head">
            <tr>
              <th className="table__cell">Задание</th>
              <th className="table__cell">Награда</th>
              <th className="table__cell">Выполнений</th>
              <th className="table__cell table__cell--center">Статус</th>
              <th className="table__cell table__cell--center">Действия</th>
            </tr>
          </thead>
          <tbody className="table__body">
            {tasks.length === 0 ? (
              <tr className="table__row">
                <td colSpan={5} className="table__cell table__cell--empty">
                  Задания не найдены
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="table__row">
                  <td className="table__cell">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--accent-light)',
                        color: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <CheckSquare size={20} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontWeight: 'var(--font-weight-semibold)', 
                          color: 'var(--text-primary)',
                          marginBottom: '4px'
                        }}>
                          {task.title}
                        </div>
                        <div style={{ 
                          fontSize: 'var(--font-size-sm)', 
                          color: 'var(--text-secondary)',
                          lineHeight: '1.4',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {task.description}
                        </div>
                        {task.action_url && (
                          <div style={{ 
                            fontSize: 'var(--font-size-xs)', 
                            color: 'var(--text-tertiary)',
                            marginTop: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Upload size={12} />
                            Есть ссылка
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="table__cell">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ 
                        fontSize: 'var(--font-size-sm)', 
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--text-primary)'
                      }}>
                        ${task.reward_min || 0} - ${task.reward_max || 0}
                      </div>
                      <div style={{ 
                        fontSize: 'var(--font-size-xs)', 
                        color: 'var(--text-secondary)' 
                      }}>
                        USDT
                      </div>
                    </div>
                  </td>
                  <td className="table__cell">
                    <div style={{ 
                      fontSize: 'var(--font-size-lg)', 
                      fontWeight: 'var(--font-weight-bold)',
                      color: 'var(--text-primary)'
                    }}>
                      {task.completions_count || 0}
                    </div>
                  </td>
                  <td className="table__cell table__cell--center">
                    <span className={`badge ${task.active ? 'badge--success' : 'badge--danger'}`}>
                      {task.active ? <><Check size={14} /> Активно</> : <><XCircle size={14} /> Неактивно</>}
                    </span>
                  </td>
                  <td className="table__cell table__cell--center">
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleEditTask(task)}
                        className="btn btn--secondary btn--icon btn--sm"
                        title="Редактировать"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="btn btn--danger btn--icon btn--sm"
                        title="Удалить"
                        disabled={deleteMutation.isPending}
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
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">
                {editingTask ? 'Редактировать задание' : 'Создать задание'}
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
                  <label className="form-label">Название задания *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Введите название задания"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Описание *</label>
                  <textarea
                    className="form-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Опишите задание для пользователей"
                    rows={4}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Минимальная награда (USDT) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.reward_min}
                      onChange={(e) => setFormData(prev => ({ ...prev, reward_min: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Максимальная награда (USDT) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.reward_max}
                      onChange={(e) => setFormData(prev => ({ ...prev, reward_max: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Ссылка на действие</label>
                  <input
                    type="url"
                    className="form-input"
                    value={formData.action_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, action_url: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">URL медиафайла</label>
                  <div className="search-input">
                    <Upload size={18} className="search-input__icon" />
                    <input
                      type="url"
                      className="search-input__field"
                      value={formData.media_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, media_url: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">ID канала Telegram</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.channel_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, channel_id: e.target.value }))}
                      placeholder="@channel или -1001234567890"
                    />
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                      Для проверки подписки. Бот должен быть админом канала!
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Тип задания</label>
                    <select
                      className="form-input"
                      value={formData.task_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, task_type: e.target.value }))}
                    >
                      <option value="subscription">Подписка на канал</option>
                      <option value="action">Действие (без проверки)</option>
                      <option value="manual">Ручная проверка</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  />
                  <label htmlFor="active" className="form-label" style={{ margin: 0 }}>
                    Активное задание
                  </label>
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
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingTask ? 'Обновить' : 'Создать'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn btn--secondary"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    Отмена
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