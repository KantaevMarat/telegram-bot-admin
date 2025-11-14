import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commandsApi, mediaApi } from '../api/client';
import { Terminal, Plus, Edit, Trash2, X, Upload, Video, FileImage, Trash } from 'lucide-react';
import toast from 'react-hot-toast';

interface Command {
  id: string;
  name: string;
  description: string;
  response: string;
  media_url?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export default function CommandsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingCommand, setEditingCommand] = useState<Command | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    response: '',
    media_url: '',
    active: true,
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
    setSelectedFile(null);
    setFormData({
      name: '',
      description: '',
      response: '',
      media_url: '',
      active: true,
    });
    setShowModal(true);
  };

  const handleEditCommand = (command: Command) => {
    setEditingCommand(command);
    setSelectedFile(null);
    setFormData({
      name: command.name,
      description: command.description,
      response: command.response,
      media_url: command.media_url || '',
      active: command.active,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCommand(null);
    setSelectedFile(null);
    setFormData({
      name: '',
      description: '',
      response: '',
      media_url: '',
      active: true,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Файл слишком большой (максимум 50 МБ)');
      return;
    }

    if (type === 'photo' && !file.type.startsWith('image/')) {
      toast.error('Выберите файл изображения');
      return;
    }
    if (type === 'video' && !file.type.startsWith('video/')) {
      toast.error('Выберите видео файл');
      return;
    }

    setSelectedFile(file);
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
    
    const submitData = {
      name: formData.name.startsWith('/') ? formData.name : `/${formData.name}`,
      description: formData.description,
      response: formData.response,
      media_url: mediaUrl || undefined,
      active: formData.active,
    };

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
        <div className="page-actions">
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
                    <code style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      backgroundColor: 'var(--bg-secondary)',
                      fontFamily: 'monospace'
                    }}>
                      {command.name}
                    </code>
                  </td>
                  <td>{command.description}</td>
                  <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {command.response}
                  </td>
                  <td>
                    {command.media_url ? (
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
                        title="Удалить"
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

                <div className="form-group">
                  <label className="form-label">Ответ бота *</label>
                  <textarea
                    className="form-input"
                    rows={5}
                    value={formData.response}
                    onChange={(e) => setFormData(prev => ({ ...prev, response: e.target.value }))}
                    placeholder="Текст, который отправит бот при выполнении команды"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Медиафайл (опционально)</label>
                  
                  <input
                    type="file"
                    ref={photoInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e, 'photo')}
                  />
                  <input
                    type="file"
                    ref={videoInputRef}
                    style={{ display: 'none' }}
                    accept="video/*"
                    onChange={(e) => handleFileSelect(e, 'video')}
                  />

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="btn btn--secondary"
                      disabled={uploadingFile}
                    >
                      <Upload size={16} />
                      Загрузить фото
                    </button>
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="btn btn--secondary"
                      disabled={uploadingFile}
                    >
                      <Video size={16} />
                      Загрузить видео
                    </button>
                  </div>

                  {selectedFile && (
                    <div className="file-preview" style={{ 
                      padding: '12px', 
                      borderRadius: '8px', 
                      backgroundColor: 'var(--bg-secondary)',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <FileImage size={20} style={{ color: 'var(--primary)' }} />
                          <strong>{selectedFile.name}</strong>
                        </div>
                        <small style={{ color: 'var(--text-secondary)' }}>
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} МБ
                        </small>
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

                  {formData.media_url && !selectedFile && (
                    <div style={{ 
                      padding: '8px 12px', 
                      borderRadius: '4px', 
                      backgroundColor: 'var(--success-bg)',
                      color: 'var(--success)',
                      fontSize: 'var(--font-size-sm)',
                      marginBottom: '12px'
                    }}>
                      ✓ Медиафайл уже загружен
                    </div>
                  )}

                  <div>
                    <label className="form-label" style={{ fontSize: 'var(--font-size-sm)', marginBottom: '8px' }}>
                      Или введите URL вручную
                    </label>
                    <input
                      type="url"
                      className="form-input"
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
                    disabled={uploadingFile || createMutation.isPending || updateMutation.isPending}
                  >
                    {uploadingFile ? 'Загрузка...' : editingCommand ? 'Сохранить' : 'Создать'}
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





