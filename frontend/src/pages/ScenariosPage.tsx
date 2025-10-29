import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scenariosApi } from '../api/client';
import { MessageCircle, Plus, Edit2, Trash2, X, Check, XCircle, LayoutGrid, LayoutList } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSyncRefetch } from '../hooks/useSync';

interface Scenario {
  id: string;
  name: string;
  trigger: string;
  response: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ScenariosPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [formData, setFormData] = useState({
    name: '',
    trigger: '',
    response: '',
    is_active: true,
  });

  const queryClient = useQueryClient();

  // Получение списка сценариев
  const { data: scenarios, isLoading, refetch } = useQuery({
    queryKey: ['scenarios'],
    queryFn: () => scenariosApi.getScenarios(),
  });

  // 🔄 Auto-refresh on sync events
  useSyncRefetch(['scenarios.created', 'scenarios.updated', 'scenarios.deleted'], refetch);

  // Создание сценария
  const createMutation = useMutation({
    mutationFn: (data: any) => scenariosApi.createScenario(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      handleCloseModal();
      toast.success('Сценарий создан!');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  // Обновление сценария
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => scenariosApi.updateScenario(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      handleCloseModal();
      toast.success('Сценарий обновлён!');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  // Удаление сценария
  const deleteMutation = useMutation({
    mutationFn: (id: string) => scenariosApi.deleteScenario(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast.success('Сценарий удалён!');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  const handleOpenModal = (scenario?: Scenario) => {
    if (scenario) {
      setEditingScenario(scenario);
      setFormData({
        name: scenario.name || '',
        trigger: scenario.trigger || '',
        response: scenario.response || '',
        is_active: scenario.is_active ?? true,
      });
    } else {
      setEditingScenario(null);
      setFormData({ name: '', trigger: '', response: '', is_active: true });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingScenario(null);
    setFormData({ name: '', trigger: '', response: '', is_active: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingScenario) {
      updateMutation.mutate({ id: editingScenario.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот сценарий?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="page">
        <header className="page-header">
          <div className="page-title-section">
            <h1 className="page-title">Сценарии</h1>
            <p className="page-subtitle">Настройка автоматических ответов</p>
          </div>
        </header>
        <div className="loading">
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
          <h1 className="page-title">Сценарии</h1>
          <p className="page-subtitle">Настройка автоматических ответов</p>
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
          <button className="btn btn--primary" onClick={() => handleOpenModal()}>
            <Plus size={16} />
            Добавить сценарий
          </button>
        </div>
      </header>
      
      {/* Список сценариев */}
      {!scenarios || scenarios.length === 0 ? (
        <div className="empty-state">
          <MessageCircle size={48} className="empty-state__icon" />
          <h3 className="empty-state__text">Нет сценариев</h3>
          <p className="empty-state__subtext">
            Создайте первый сценарий автоматического ответа
          </p>
          <button className="btn btn--primary" onClick={() => handleOpenModal()}>
            <Plus size={16} />
            Добавить сценарий
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="table-responsive">
          <div className="table-container">
            <table className="table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Триггер</th>
                <th>Ответ</th>
                <th>Статус</th>
                <th>Дата создания</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((scenario: Scenario) => (
                <tr key={scenario.id}>
                  <td>
                    <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                      {scenario.name}
                    </span>
                  </td>
                  <td>
                    <code style={{
                      background: 'var(--bg-secondary)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: 'var(--font-size-sm)',
                    }}>
                      {scenario.trigger}
                    </code>
                  </td>
                  <td>
                    <div style={{
                      maxWidth: '300px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {scenario.response}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${scenario.is_active ? 'badge--success' : 'badge--danger'}`}>
                      {scenario.is_active ? <><Check size={14} /> Активен</> : <><XCircle size={14} /> Отключён</>}
                    </span>
                  </td>
                  <td>
                    {new Date(scenario.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn--secondary btn--icon btn--sm"
                        onClick={() => handleOpenModal(scenario)}
                        title="Редактировать"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn btn--danger btn--icon btn--sm"
                        onClick={() => handleDelete(scenario.id)}
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
      ) : (
        <div className="cards-grid">
          {scenarios.map((scenario: Scenario) => (
            <div key={scenario.id} className="scenario-card">
              <div className="scenario-card__header">
                <div className="scenario-card__avatar">
                  <MessageCircle size={32} />
                </div>
                <div className="scenario-card__info">
                  <h3 className="scenario-card__name">{scenario.name}</h3>
                  <div className="scenario-card__trigger">
                    <code>{scenario.trigger}</code>
                  </div>
                </div>
                <span className={`badge ${scenario.is_active ? 'badge--success' : 'badge--danger'}`}>
                  {scenario.is_active ? <><Check size={14} /> Активен</> : <><XCircle size={14} /> Отключён</>}
                </span>
              </div>

              <div className="scenario-card__content">
                <div className="scenario-card__response">
                  <span className="scenario-card__label">Ответ:</span>
                  <p className="scenario-card__text">{scenario.response}</p>
                </div>
              </div>

              <div className="scenario-card__meta">
                <span className="scenario-card__date">
                  Создан: {new Date(scenario.created_at).toLocaleDateString('ru-RU')}
                </span>
                {scenario.updated_at && scenario.updated_at !== scenario.created_at && (
                  <span className="scenario-card__date">
                    Обновлён: {new Date(scenario.updated_at).toLocaleDateString('ru-RU')}
                  </span>
                )}
              </div>

              <div className="scenario-card__actions">
                <button
                  onClick={() => handleOpenModal(scenario)}
                  className="btn btn--secondary btn--sm"
                  title="Редактировать"
                >
                  <Edit2 size={16} />
                  Редактировать
                </button>
                <button
                  onClick={() => handleDelete(scenario.id)}
                  className="btn btn--danger btn--sm"
                  title="Удалить"
                >
                  <Trash2 size={16} />
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">
                {editingScenario ? 'Редактировать сценарий' : 'Добавить сценарий'}
              </h2>
              <button 
                className="btn btn--secondary btn--icon btn--sm" 
                onClick={handleCloseModal}
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label" htmlFor="name">
                    Название <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    className="form-input"
                    placeholder="Например: Приветствие"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="trigger">
                    Триггер <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    id="trigger"
                    type="text"
                    className="form-input"
                    placeholder="Например: /start или привет"
                    value={formData.trigger}
                    onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                    required
                  />
                  <p style={{ 
                    margin: '4px 0 0 0', 
                    fontSize: 'var(--font-size-xs)', 
                    color: 'var(--text-tertiary)' 
                  }}>
                    Слово или команда, на которую будет срабатывать сценарий
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="response">
                    Ответ <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <textarea
                    id="response"
                    className="form-textarea"
                    placeholder="Текст автоматического ответа"
                    value={formData.response}
                    onChange={(e) => setFormData({ ...formData, response: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                      Активен
                    </span>
                  </label>
                </div>
              </div>

              <div className="modal__footer">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={handleCloseModal}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <MessageCircle size={16} />
                  {editingScenario ? 'Обновить' : 'Добавить'}
                </button>
              </div>
            </form>
          </div>
      </div>
      )}
    </div>
  );
}