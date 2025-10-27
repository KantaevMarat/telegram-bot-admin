import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buttonsApi } from '../api/client';
import { Square, Plus, Edit, Trash2, X, Image, Link, MessageSquare, LayoutGrid, LayoutList, Check, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Button {
  id: string;
  label: string;
  action_type: string;
  action_payload: any;
  media_url?: string;
  row: number;
  col: number;
  active: boolean;
}

// Helper function to safely extract display text from action_payload
const getActionPayloadText = (actionPayload: any, actionType: string): string => {
  try {
    if (actionPayload === null || actionPayload === undefined) {
      return '';
    }

    if (typeof actionPayload === 'string') {
      return actionPayload;
    }

    if (actionType === 'url') {
      if (typeof actionPayload === 'object' && actionPayload !== null && actionPayload.url) {
        return String(actionPayload.url);
      }
      return '';
    }

    if (typeof actionPayload === 'object' && actionPayload !== null) {
      if (actionPayload.text) {
        if (typeof actionPayload.text === 'object' && actionPayload.text !== null && actionPayload.text.text) {
          return String(actionPayload.text.text);
        }
        if (typeof actionPayload.text === 'string') {
          return String(actionPayload.text);
        }
      }
      return '';
    }

    return String(actionPayload);
  } catch (error) {
    console.error('Error extracting action payload text:', error);
    return '';
  }
};

export default function ButtonsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingButton, setEditingButton] = useState<Button | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  const [formData, setFormData] = useState({
    label: '',
    action_type: 'text',
    action_payload: '',
    media_url: '',
    row: 1,
    col: 1,
    active: true,
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['buttons'],
    queryFn: () => buttonsApi.getButtons(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => buttonsApi.createButton(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buttons'] });
      handleCloseModal();
      toast.success('Кнопка создана!');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => buttonsApi.updateButton(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buttons'] });
      handleCloseModal();
      toast.success('Кнопка обновлена!');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => buttonsApi.deleteButton(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buttons'] });
      toast.success('Кнопка удалена!');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  const handleOpenModal = () => {
    setEditingButton(null);
    setFormData({
      label: '',
      action_type: 'text',
      action_payload: '',
      media_url: '',
      row: 1,
      col: 1,
      active: true,
    });
    setShowModal(true);
  };

  const handleEditButton = (button: Button) => {
    setEditingButton(button);
    setFormData({
      label: button.label,
      action_type: button.action_type,
      action_payload: getActionPayloadText(button.action_payload, button.action_type),
      media_url: button.media_url || '',
      row: button.row,
      col: button.col,
      active: button.active,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingButton(null);
    setFormData({
      label: '',
      action_type: 'text',
      action_payload: '',
      media_url: '',
      row: 1,
      col: 1,
      active: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      action_payload: formData.action_type === 'url' 
        ? { url: formData.action_payload }
        : { text: { text: formData.action_payload } }
    };

    if (editingButton) {
      updateMutation.mutate({ id: editingButton.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту кнопку?')) {
      deleteMutation.mutate(id);
    }
  };

  const buttons = data || [];

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-section">
            <h1 className="page-title">Кнопки</h1>
            <p className="page-subtitle">Управление интерактивными кнопками</p>
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
          <h1 className="page-title">Кнопки</h1>
          <p className="page-subtitle">Управление интерактивными кнопками</p>
        </div>
        <div className="page-actions">
          <button
            onClick={handleOpenModal}
            className="btn btn--primary"
          >
            <Plus size={16} />
            Добавить кнопку
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card stat-card--info">
          <div className="stat-card__icon">
            <Square size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{buttons.length}</div>
            <div className="stat-card__label">Всего кнопок</div>
          </div>
        </div>
        
        <div className="stat-card stat-card--success">
          <div className="stat-card__icon">
            <Square size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{buttons.filter(b => b.active).length}</div>
            <div className="stat-card__label">Активных</div>
          </div>
        </div>
        
        <div className="stat-card stat-card--warning">
          <div className="stat-card__icon">
            <Square size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{buttons.filter(b => !b.active).length}</div>
            <div className="stat-card__label">Неактивных</div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="filters-section" style={{ marginBottom: '24px' }}>
        <div className="view-mode-toggle">
          <button
            onClick={() => setViewMode('table')}
            className={`view-mode-toggle__btn ${viewMode === 'table' ? 'view-mode-toggle__btn--active' : ''}`}
            title="Режим таблицы"
          >
            <LayoutList size={16} />
            Таблица
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`view-mode-toggle__btn ${viewMode === 'cards' ? 'view-mode-toggle__btn--active' : ''}`}
            title="Режим карточек"
          >
            <LayoutGrid size={16} />
            Карточки
          </button>
        </div>
      </div>

      {/* Buttons Table or Cards */}
      {viewMode === 'table' ? (
        <div className="table-responsive">
          <div className="table-container">
            <table className="table">
          <thead className="table__head">
            <tr>
              <th className="table__cell">Кнопка</th>
              <th className="table__cell">Тип</th>
              <th className="table__cell">Действие</th>
              <th className="table__cell table__cell--center">Позиция</th>
              <th className="table__cell table__cell--center">Статус</th>
              <th className="table__cell table__cell--center">Действия</th>
            </tr>
          </thead>
          <tbody className="table__body">
            {buttons.length === 0 ? (
              <tr className="table__row">
                <td colSpan={6} className="table__cell table__cell--empty">
                  Кнопки не найдены
                </td>
              </tr>
            ) : (
              buttons.map((button) => (
                <tr key={button.id} className="table__row">
                  <td className="table__cell">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--accent-light)',
                        color: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Square size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>
                          {button.label}
                        </div>
                        {button.media_url && (
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                            <Image size={12} style={{ display: 'inline', marginRight: '4px' }} />
                            С медиа
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="table__cell">
                    <span className="badge badge--info">
                      Inline
                    </span>
                  </td>
                  <td className="table__cell">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {button.action_type === 'url' ? (
                        <Link size={14} style={{ color: 'var(--info)' }} />
                      ) : (
                        <MessageSquare size={14} style={{ color: 'var(--accent)' }} />
                      )}
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        {getActionPayloadText(button.action_payload, button.action_type) || 'Пусто'}
                      </span>
                    </div>
                  </td>
                  <td className="table__cell table__cell--center">
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                      {button.row}x{button.col}
                    </span>
                  </td>
                  <td className="table__cell table__cell--center">
                    <span className={`badge ${button.active ? 'badge--success' : 'badge--error'}`}>
                      {button.active ? 'Активна' : 'Неактивна'}
                    </span>
                  </td>
                  <td className="table__cell table__cell--center">
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleEditButton(button)}
                        className="btn btn--secondary btn--icon btn--sm"
                        title="Редактировать"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(button.id)}
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
      ) : (
        <div className="cards-grid">
          {buttons.length === 0 ? (
            <div className="empty-state">
              <Square size={48} />
              <p>Нет кнопок</p>
            </div>
          ) : (
            buttons.map((button: Button) => (
              <div key={button.id} className="button-card">
                <div className="button-card__header">
                  <div className="button-card__avatar">
                    {button.action_type === 'url' ? (
                      <Link size={28} />
                    ) : button.media_url ? (
                      <Image size={28} />
                    ) : (
                      <MessageSquare size={28} />
                    )}
                  </div>
                  <div className="button-card__info">
                    <h3 className="button-card__name">{button.label}</h3>
                    <p className="button-card__type">
                      {button.action_type === 'url' ? 'URL ссылка' : 
                       button.action_type === 'inline_query' ? 'Inline запрос' : 
                       'Текстовое сообщение'}
                    </p>
                  </div>
                  <span className={`badge ${button.active ? 'badge--success' : 'badge--danger'}`}>
                    {button.active ? <><Check size={14} /> Активна</> : <><XCircle size={14} /> Неактивна</>}
                  </span>
                </div>

                <div className="button-card__stats">
                  <div className="button-card__stat">
                    <Square size={16} />
                    <span className="button-card__stat-label">Позиция:</span>
                    <span className="button-card__stat-value">Ряд {button.row}, Кол {button.col}</span>
                  </div>
                  {button.action_type === 'url' ? (
                    <div className="button-card__stat">
                      <Link size={16} />
                      <span className="button-card__stat-label">URL:</span>
                      <span className="button-card__stat-value button-card__stat-value--truncate">
                        {getActionPayloadText(button.action_payload, button.action_type) || 'Нет URL'}
                      </span>
                    </div>
                  ) : (
                    <div className="button-card__stat">
                      <MessageSquare size={16} />
                      <span className="button-card__stat-label">Текст:</span>
                      <span className="button-card__stat-value button-card__stat-value--truncate">
                        {getActionPayloadText(button.action_payload, button.action_type) || 'Нет текста'}
                      </span>
                    </div>
                  )}
                  {button.media_url && (
                    <div className="button-card__stat">
                      <Image size={16} />
                      <span className="button-card__stat-label">Медиа:</span>
                      <span className="button-card__stat-value">Прикреплено</span>
                    </div>
                  )}
                </div>

                <div className="button-card__actions">
                  <button
                    onClick={() => handleEditButton(button)}
                    className="btn btn--secondary btn--sm"
                    title="Редактировать"
                  >
                    <Edit size={16} />
                    Редактировать
                  </button>
                  <button
                    onClick={() => handleDeleteButton(button.id)}
                    className="btn btn--danger btn--sm"
                    title="Удалить"
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">
                {editingButton ? 'Редактировать кнопку' : 'Создать кнопку'}
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
                  <label className="form-label">Название кнопки *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.label}
                    onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Введите название кнопки"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Тип действия</label>
                  <select
                    className="form-select"
                    value={formData.action_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, action_type: e.target.value }))}
                  >
                    <option value="text">Текст</option>
                    <option value="url">URL</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {formData.action_type === 'url' ? 'URL' : 'Текст'} *
                  </label>
                  <input
                    type={formData.action_type === 'url' ? 'url' : 'text'}
                    className="form-input"
                    value={formData.action_payload}
                    onChange={(e) => setFormData(prev => ({ ...prev, action_payload: e.target.value }))}
                    placeholder={formData.action_type === 'url' ? 'https://example.com' : 'Введите текст'}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">URL медиафайла</label>
                  <div className="search-input">
                    <Image size={18} className="search-input__icon" />
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
                    <label className="form-label">Строка</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.row}
                      onChange={(e) => setFormData(prev => ({ ...prev, row: parseInt(e.target.value) || 1 }))}
                      min="1"
                      max="10"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Колонка</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.col}
                      onChange={(e) => setFormData(prev => ({ ...prev, col: parseInt(e.target.value) || 1 }))}
                      min="1"
                      max="10"
                    />
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
                    Активная кнопка
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
                    {editingButton ? 'Обновить' : 'Создать'}
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