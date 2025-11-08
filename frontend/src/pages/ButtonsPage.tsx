import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buttonsApi, mediaApi } from '../api/client';
import { Square, Plus, Edit, Trash2, X, Image, Link, MessageSquare, LayoutGrid, LayoutList, Check, XCircle, Upload, Video, FileImage, Trash } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSyncRefetch } from '../hooks/useSync';

interface Button {
  id: string;
  label: string;
  action_type: string;
  action_payload: any;
  media_url?: string;
  command?: string;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    label: '',
    action_type: 'text',
    action_payload: '',
    action_url: '',
    media_url: '',
    command: '',
    row: 1,
    col: 1,
    active: true,
    button_type: 'reply', // 'reply' for ReplyKeyboard, 'inline' for InlineKeyboard
    inline_buttons: [] as Array<{ text: string; type: 'url' | 'callback' | 'web_app'; url?: string; callback?: string; web_app_url?: string }>,
  });

  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['buttons'],
    queryFn: () => buttonsApi.getButtons(),
  });

  // 🔄 Auto-refresh on sync events
  useSyncRefetch(['buttons.created', 'buttons.updated', 'buttons.deleted'], refetch);

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
    setSelectedFile(null);
    setFormData({
      label: '',
      action_type: 'text',
      action_payload: '',
      action_url: '',
      media_url: '',
      command: '',
      row: 1,
      col: 1,
      active: true,
      button_type: 'reply',
      inline_buttons: [],
    });
    setShowModal(true);
  };

  const handleEditButton = (button: Button) => {
    // Parse inline buttons from action_payload if they exist
    let inlineButtons: Array<{ text: string; type: 'url' | 'callback' | 'web_app'; url?: string; callback?: string; web_app_url?: string }> = [];
    let actionUrl = '';
    let buttonType: 'reply' | 'inline' = 'reply';
    let actionPayloadText = getActionPayloadText(button.action_payload, button.action_type);
    
    // Check for inline buttons
    if (button.action_payload && typeof button.action_payload === 'object') {
      if (button.action_payload.inline_buttons && Array.isArray(button.action_payload.inline_buttons)) {
        buttonType = 'inline';
        inlineButtons = button.action_payload.inline_buttons.map((btn: any) => {
          if (btn.url) {
            return { text: btn.text || '', type: 'url' as const, url: btn.url };
          } else if (btn.web_app?.url) {
            return { text: btn.text || '', type: 'web_app' as const, web_app_url: btn.web_app.url };
          } else {
            return { text: btn.text || '', type: 'callback' as const, callback: btn.callback_data || '' };
          }
        });
        
        // Extract text from payload
        if (button.action_payload.text) {
          actionPayloadText = button.action_payload.text;
        }
      } else if (button.action_type === 'url' && button.action_payload.url) {
        actionUrl = button.action_payload.url;
        if (button.action_payload.text) {
          actionPayloadText = button.action_payload.text;
        }
      } else if (button.action_payload?.text?.text) {
        actionPayloadText = button.action_payload.text.text;
      }
    }
    
    setEditingButton(button);
    setFormData({
      label: button.label,
      action_type: button.action_type,
      action_payload: actionPayloadText,
      action_url: actionUrl,
      media_url: button.media_url || '',
      command: button.command || '',
      row: button.row,
      col: button.col,
      active: button.active,
      button_type: buttonType,
      inline_buttons: inlineButtons,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingButton(null);
    setSelectedFile(null);
    setFormData({
      label: '',
      action_type: 'text',
      action_payload: '',
      action_url: '',
      media_url: '',
      command: '',
      row: 1,
      col: 1,
      active: true,
      button_type: 'reply',
      inline_buttons: [],
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Файл слишком большой (максимум 50 МБ)');
      return;
    }

    // Validate file type
    if (type === 'photo' && !file.type.startsWith('image/')) {
      toast.error('Выберите файл изображения');
      return;
    }
    if (type === 'video' && !file.type.startsWith('video/')) {
      toast.error('Выберите видео файл');
      return;
    }

    setSelectedFile(file);
    
    // Clear the input so the same file can be selected again
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFormData(prev => ({ ...prev, media_url: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Upload file if selected
    let mediaUrl = formData.media_url;
    if (selectedFile) {
      setUploadingFile(true);
      try {
        const result = await mediaApi.uploadFile(selectedFile);
        mediaUrl = result.url;
        toast.success('Файл загружен успешно!');
      } catch (error: any) {
        toast.error(`Ошибка загрузки файла: ${error.response?.data?.message || error.message}`);
        setUploadingFile(false);
        return;
      }
      setUploadingFile(false);
    }
    
    // Build action_payload based on type and inline buttons
    let actionPayload: any;
    
    if (formData.button_type === 'inline' && formData.inline_buttons.length > 0) {
      // Message with inline buttons
      actionPayload = {
        text: formData.action_payload || formData.label,
        inline_buttons: formData.inline_buttons.map(btn => {
          if (btn.type === 'url') {
            return { text: btn.text, url: btn.url };
          } else if (btn.type === 'web_app') {
            return { text: btn.text, web_app: { url: btn.web_app_url } };
          } else {
            return { text: btn.text, callback_data: btn.callback || `btn_${Date.now()}` };
          }
        })
      };
    } else if (formData.action_type === 'url') {
      // URL button (can also have inline buttons if needed)
      actionPayload = { 
        url: formData.action_url || formData.action_payload,
        inline_buttons: formData.inline_buttons.length > 0 ? formData.inline_buttons.map(btn => {
          if (btn.type === 'url') return { text: btn.text, url: btn.url };
          if (btn.type === 'web_app') return { text: btn.text, web_app: { url: btn.web_app_url } };
          return { text: btn.text, callback_data: btn.callback || `btn_${Date.now()}` };
        }) : undefined
      };
    } else {
      // Text message
      actionPayload = { 
        text: { text: formData.action_payload },
        inline_buttons: formData.inline_buttons.length > 0 ? formData.inline_buttons.map(btn => {
          if (btn.type === 'url') return { text: btn.text, url: btn.url };
          if (btn.type === 'web_app') return { text: btn.text, web_app: { url: btn.web_app_url } };
          return { text: btn.text, callback_data: btn.callback || `btn_${Date.now()}` };
        }) : undefined
      };
    }

    const submitData = {
      label: formData.label || formData.command || 'Кнопка', // Use command as label if label is empty
      action_type: formData.action_type,
      action_payload: actionPayload || undefined,
      media_url: mediaUrl || undefined,
      command: formData.command || undefined,
      row: formData.row,
      col: formData.col,
      active: formData.active,
    };

    if (editingButton) {
      updateMutation.mutate({ id: editingButton.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const addInlineButton = () => {
    setFormData(prev => ({
      ...prev,
      inline_buttons: [...prev.inline_buttons, { text: '', type: 'url' as const }]
    }));
  };

  const updateInlineButton = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      inline_buttons: prev.inline_buttons.map((btn, i) => 
        i === index ? { ...btn, [field]: value } : btn
      )
    }));
  };

  const removeInlineButton = (index: number) => {
    setFormData(prev => ({
      ...prev,
      inline_buttons: prev.inline_buttons.filter((_, i) => i !== index)
    }));
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
                    onClick={() => handleDelete(button.id)}
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
                  <label className="form-label">Название кнопки</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.label}
                    onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Введите название кнопки (необязательно)"
                  />
                  <small className="form-hint" style={{ marginTop: '4px', display: 'block', color: 'var(--text-secondary)' }}>
                    Можно оставить пустым, если кнопка только выполняет команду
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Тип кнопки</label>
                  <select
                    className="form-select"
                    value={formData.button_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, button_type: e.target.value as 'reply' | 'inline' }))}
                  >
                    <option value="reply">Постоянная кнопка (внизу)</option>
                    <option value="inline">Кнопка с подкнопками</option>
                  </select>
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

                {formData.button_type === 'reply' && (
                  <div className="form-group">
                    <label className="form-label">
                      {formData.action_type === 'url' ? 'URL' : 'Текст при нажатии'}
                    </label>
                    <input
                      type={formData.action_type === 'url' ? 'url' : 'text'}
                      className="form-input"
                      value={formData.action_url || formData.action_payload}
                      onChange={(e) => {
                        if (formData.action_type === 'url') {
                          setFormData(prev => ({ ...prev, action_url: e.target.value }));
                        } else {
                          setFormData(prev => ({ ...prev, action_payload: e.target.value }));
                        }
                      }}
                      placeholder={formData.action_type === 'url' ? 'https://example.com' : 'Введите текст (необязательно)'}
                    />
                  </div>
                )}

                {formData.button_type === 'inline' && (
                  <div className="form-group">
                    <label className="form-label">Текст сообщения</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={formData.action_payload}
                      onChange={(e) => setFormData(prev => ({ ...prev, action_payload: e.target.value }))}
                      placeholder="Текст сообщения, которое покажется с кнопками под ним (необязательно)"
                    />
                  </div>
                )}

                {formData.button_type === 'inline' && (
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label className="form-label">Кнопки под сообщением</label>
                      <button
                        type="button"
                        onClick={addInlineButton}
                        className="btn btn--secondary btn--sm"
                      >
                        <Plus size={14} />
                        Добавить кнопку
                      </button>
                    </div>
                    {formData.inline_buttons.map((btn, index) => (
                      <div key={index} style={{ 
                        display: 'flex', 
                        gap: '8px', 
                        marginBottom: '8px',
                        padding: '12px',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--background-secondary)'
                      }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 1 }}
                          value={btn.text}
                          onChange={(e) => updateInlineButton(index, 'text', e.target.value)}
                          placeholder="Текст кнопки"
                        />
                        <select
                          className="form-select"
                          style={{ width: '120px' }}
                          value={btn.type}
                          onChange={(e) => updateInlineButton(index, 'type', e.target.value)}
                        >
                          <option value="url">Ссылка</option>
                          <option value="callback">Действие</option>
                          <option value="web_app">Web App</option>
                        </select>
                        {btn.type === 'url' && (
                          <input
                            type="url"
                            className="form-input"
                            style={{ flex: 1 }}
                            value={btn.url || ''}
                            onChange={(e) => updateInlineButton(index, 'url', e.target.value)}
                            placeholder="https://example.com"
                          />
                        )}
                        {btn.type === 'callback' && (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <input
                              type="text"
                              className="form-input"
                              value={btn.callback || ''}
                              onChange={(e) => updateInlineButton(index, 'callback', e.target.value)}
                              placeholder="ID кнопки или команда (например: button_123 или tasks)"
                            />
                            <small className="form-hint" style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                              💡 Введите ID кнопки из БД (UUID) или специальную команду: tasks, balance, profile, withdraw, referral, menu
                            </small>
                          </div>
                        )}
                        {btn.type === 'web_app' && (
                          <input
                            type="url"
                            className="form-input"
                            style={{ flex: 1 }}
                            value={btn.web_app_url || ''}
                            onChange={(e) => updateInlineButton(index, 'web_app_url', e.target.value)}
                            placeholder="https://app.example.com"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removeInlineButton(index)}
                          className="btn btn--danger btn--icon btn--sm"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {formData.inline_buttons.length === 0 && (
                      <div style={{ 
                        padding: '16px', 
                        textAlign: 'center', 
                        color: 'var(--text-secondary)',
                        backgroundColor: 'var(--background-secondary)',
                        borderRadius: 'var(--radius-md)'
                      }}>
                        Нет кнопок. Нажмите "Добавить кнопку" чтобы создать.
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Медиафайл (фото или видео)</label>
                  
                  {/* File upload buttons */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <label style={{ flex: 1 }}>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect(e, 'photo')}
                        style={{ display: 'none' }}
                      />
                      <div className="btn btn--secondary" style={{ width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <FileImage size={18} />
                        Загрузить фото
                      </div>
                    </label>
                    
                    <label style={{ flex: 1 }}>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleFileSelect(e, 'video')}
                        style={{ display: 'none' }}
                      />
                      <div className="btn btn--secondary" style={{ width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Video size={18} />
                        Загрузить видео
                      </div>
                    </label>
                  </div>

                  {/* Selected file preview */}
                  {selectedFile && (
                    <div style={{
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      {selectedFile.type.startsWith('image/') ? (
                        <FileImage size={24} style={{ color: 'var(--accent)' }} />
                      ) : (
                        <Video size={24} style={{ color: 'var(--accent)' }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
                          {selectedFile.name}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} МБ
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="btn btn--danger btn--icon btn--sm"
                        title="Удалить файл"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  )}

                  {/* Existing media URL preview */}
                  {formData.media_url && !selectedFile && (
                    <div style={{
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <Image size={24} style={{ color: 'var(--info)' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                          {formData.media_url}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, media_url: '' }))}
                        className="btn btn--danger btn--icon btn--sm"
                        title="Удалить URL"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  )}

                  {/* Manual URL input */}
                  <div style={{ marginTop: '12px' }}>
                    <label className="form-label" style={{ fontSize: 'var(--font-size-sm)', marginBottom: '8px' }}>
                      Или введите URL вручную
                    </label>
                    <div className="search-input">
                      <Link size={18} className="search-input__icon" />
                      <input
                        type="url"
                        className="search-input__field"
                        value={selectedFile ? '' : formData.media_url}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, media_url: e.target.value }));
                          setSelectedFile(null);
                        }}
                        placeholder="https://example.com/image.jpg"
                        disabled={!!selectedFile}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Команда (опционально)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.command}
                    onChange={(e) => setFormData(prev => ({ ...prev, command: e.target.value }))}
                    placeholder="/start или любая другая команда"
                  />
                  <small className="form-hint" style={{ marginTop: '4px', display: 'block', color: 'var(--text-secondary)' }}>
                    Команда выполнится при нажатии на кнопку (например, /start, /balance, /tasks)
                  </small>
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
                    disabled={createMutation.isPending || updateMutation.isPending || uploadingFile}
                  >
                    {uploadingFile ? (
                      <>
                        <Upload size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        Загрузка...
                      </>
                    ) : editingButton ? (
                      'Обновить'
                    ) : (
                      'Создать'
                    )}
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