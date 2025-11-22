import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buttonsApi } from '../api/client';
import { ButtonConfig } from '../types/button.types';
import { oldButtonToNewConfig, newConfigToOldButton } from '../utils/buttonAdapter';
import ButtonEditor from '../components/buttons/ButtonEditor';
import { Square, Plus, Edit, Trash2, Download, Copy, LayoutGrid, LayoutList } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSyncRefetch } from '../hooks/useSync';
import { exportButtonToJSON, downloadJSON } from '../utils/buttonExport';

interface OldButton {
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

export default function ButtonsPageV2() {
  const [showEditor, setShowEditor] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ButtonConfig | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const queryClient = useQueryClient();

  const { data: buttons, isLoading, refetch } = useQuery({
    queryKey: ['buttons'],
    queryFn: () => buttonsApi.getButtons(),
  });

  useSyncRefetch(['buttons.created', 'buttons.updated', 'buttons.deleted'], refetch);

  const createMutation = useMutation({
    mutationFn: async (config: ButtonConfig) => {
      // При создании не передаем ID - backend сам сгенерирует UUID
      const oldButton = newConfigToOldButton(config, false);
      // Удаляем ID из данных, если он есть
      delete (oldButton as any).id;
      return buttonsApi.createButton(oldButton);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buttons'] });
      setShowEditor(false);
      setEditingConfig(null);
      toast.success('Кнопка создана!');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, config }: { id: string; config: ButtonConfig }) => {
      // При обновлении используем существующий ID из базы
      const oldButton = newConfigToOldButton(config, true);
      // Используем ID из параметра, а не из config (config.id может быть временным)
      return buttonsApi.updateButton(id, oldButton);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buttons'] });
      setShowEditor(false);
      setEditingConfig(null);
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

  const handleCreate = () => {
    setEditingConfig(null); // Явно сбрасываем, чтобы указать что это создание
    setShowEditor(true);
  };

  const handleEdit = (button: OldButton) => {
    const config = oldButtonToNewConfig(button);
    setEditingConfig(config); // Сохраняем оригинальный конфиг с UUID из базы
    setShowEditor(true);
  };

  const handleSave = async (config: ButtonConfig) => {
    // Проверяем, что editingConfig существует И имеет валидный UUID
    // UUID должен быть в формате: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (editingConfig && editingConfig.id && uuidRegex.test(editingConfig.id)) {
      // Это обновление существующей кнопки - используем оригинальный UUID
      console.log('🔄 Updating button with UUID:', editingConfig.id);
      await updateMutation.mutateAsync({ id: editingConfig.id, config });
      return;
    }
    
    // В противном случае - это создание новой кнопки
    // Убеждаемся что ID не передается (или пустой/невалидный)
    const configForCreate = { ...config };
    delete configForCreate.id; // Удаляем ID, если он есть
    console.log('➕ Creating new button (ID removed):', configForCreate);
    await createMutation.mutateAsync(configForCreate);
  };

  const handleTest = async (config: ButtonConfig) => {
    try {
      const result = await buttonsApi.testButtonConfig(config);
      if (result.success) {
        toast.success('Тест выполнен успешно!');
      } else {
        toast.error(`Ошибка теста: ${result.error}`);
      }
      return result;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message);
    }
  };

  const handleExport = (button: OldButton) => {
    const config = oldButtonToNewConfig(button);
    const json = exportButtonToJSON(config);
    downloadJSON(json, `button-${button.id}.json`);
    toast.success('Конфигурация экспортирована!');
  };

  const handleDuplicate = (button: OldButton) => {
    const config = oldButtonToNewConfig(button);
    // Удаляем ID - при сохранении будет создана новая кнопка с новым UUID
    const duplicatedConfig = { ...config };
    delete duplicatedConfig.id;
    duplicatedConfig.label = `${config.label} (копия)`;
    // Устанавливаем конфиг БЕЗ ID - система поймет что это создание
    setEditingConfig(duplicatedConfig);
    setShowEditor(true);
  };

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Кнопки</h1>
        </div>
        <div className="loading">
          <div className="loading-skeleton" style={{ height: '200px' }}></div>
        </div>
      </div>
    );
  }

  const buttonsList = buttons || [];

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Кнопки</h1>
          <p className="page-subtitle">Управление интерактивными кнопками Telegram</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: '12px' }}>
          <div className="view-toggle">
            <button
              onClick={() => setViewMode('table')}
              className={`btn btn--secondary btn--sm btn--icon ${viewMode === 'table' ? 'btn--active' : ''}`}
            >
              <LayoutList size={18} />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`btn btn--secondary btn--sm btn--icon ${viewMode === 'cards' ? 'btn--active' : ''}`}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
          <button onClick={handleCreate} className="btn btn--primary">
            <Plus size={16} />
            Создать кнопку
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card stat-card--info">
          <div className="stat-card__icon">
            <Square size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{buttonsList.length}</div>
            <div className="stat-card__label">Всего кнопок</div>
          </div>
        </div>
        <div className="stat-card stat-card--success">
          <div className="stat-card__icon">
            <Square size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{buttonsList.filter((b: OldButton) => b.active).length}</div>
            <div className="stat-card__label">Активных</div>
          </div>
        </div>
      </div>

      {/* Buttons List */}
      {viewMode === 'table' ? (
        <div className="table-responsive">
          <div className="table-container">
            <table className="table">
              <thead className="table__head">
                <tr>
                  <th>Кнопка</th>
                  <th>Тип</th>
                  <th>Действие</th>
                  <th className="table__cell--center">Статус</th>
                  <th className="table__cell--center">Действия</th>
                </tr>
              </thead>
              <tbody className="table__body">
                {buttonsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table__cell table__cell--empty">
                      Кнопки не найдены
                    </td>
                  </tr>
                ) : (
                  buttonsList.map((button: OldButton) => (
                    <tr key={button.id}>
                      <td className="table__cell">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: 'var(--radius-md)',
                              background: 'var(--accent-light)',
                              color: 'var(--accent)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Square size={16} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>{button.label}</div>
                            {button.media_url && (
                              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                С медиа
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="table__cell">
                        <span className="badge badge--info">{button.action_type}</span>
                      </td>
                      <td className="table__cell">
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                          {button.command || 'N/A'}
                        </div>
                      </td>
                      <td className="table__cell table__cell--center">
                        <span className={`badge ${button.active ? 'badge--success' : 'badge--error'}`}>
                          {button.active ? 'Активна' : 'Неактивна'}
                        </span>
                      </td>
                      <td className="table__cell table__cell--center">
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleEdit(button)}
                            className="btn btn--secondary btn--icon btn--sm"
                            title="Редактировать"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDuplicate(button)}
                            className="btn btn--secondary btn--icon btn--sm"
                            title="Дублировать"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => handleExport(button)}
                            className="btn btn--secondary btn--icon btn--sm"
                            title="Экспорт JSON"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Удалить кнопку?')) {
                                deleteMutation.mutate(button.id);
                              }
                            }}
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
        </div>
      ) : (
        <div className="cards-grid">
          {buttonsList.length === 0 ? (
            <div className="empty-state">
              <Square size={48} />
              <p>Нет кнопок</p>
            </div>
          ) : (
            buttonsList.map((button: OldButton) => (
              <div key={button.id} className="button-card">
                <div className="button-card__header">
                  <div className="button-card__avatar">
                    <Square size={28} />
                  </div>
                  <div className="button-card__info">
                    <h3 className="button-card__name">{button.label}</h3>
                    <p className="button-card__type">{button.action_type}</p>
                  </div>
                  <span className={`badge ${button.active ? 'badge--success' : 'badge--danger'}`}>
                    {button.active ? 'Активна' : 'Неактивна'}
                  </span>
                </div>
                <div className="button-card__actions">
                  <button onClick={() => handleEdit(button)} className="btn btn--secondary btn--sm">
                    <Edit size={16} />
                    Редактировать
                  </button>
                  <button onClick={() => handleDuplicate(button)} className="btn btn--secondary btn--sm">
                    <Copy size={16} />
                    Дублировать
                  </button>
                  <button onClick={() => handleExport(button)} className="btn btn--secondary btn--sm">
                    <Download size={16} />
                    Экспорт
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Удалить кнопку?')) {
                        deleteMutation.mutate(button.id);
                      }
                    }}
                    className="btn btn--danger btn--sm"
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

      {/* Editor Modal */}
      {showEditor && (
        <ButtonEditor
          key={editingConfig?.id || 'new'} // Принудительное пересоздание компонента при смене режима
          config={editingConfig || undefined}
          existingConfigs={buttonsList.map((b: OldButton) => oldButtonToNewConfig(b))}
          onSave={handleSave}
          onClose={() => {
            setShowEditor(false);
            setEditingConfig(null);
          }}
          onTest={handleTest}
        />
      )}
    </div>
  );
}

