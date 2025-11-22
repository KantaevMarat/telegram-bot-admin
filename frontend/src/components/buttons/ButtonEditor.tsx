import { useState, useEffect } from 'react';
import { ButtonConfig, ButtonValidationError } from '../../types/button.types';
import { validateButtonConfig } from '../../utils/buttonValidation';
import { exportButtonToJSON, downloadJSON, importButtonFromJSON } from '../../utils/buttonExport';
import ButtonModeSelector from './ButtonModeSelector';
import ModeConfigPanel from './ModeConfigPanel';
import SectionsEditor from './SectionsEditor';
import ButtonPreview from './ButtonPreview';
import { X, Save, Download, Upload, TestTube, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ButtonEditorProps {
  config?: ButtonConfig;
  existingConfigs?: ButtonConfig[];
  onSave: (config: ButtonConfig) => Promise<void>;
  onClose: () => void;
  onTest?: (config: ButtonConfig) => Promise<void>;
}

export default function ButtonEditor({
  config: initialConfig,
  existingConfigs = [],
  onSave,
  onClose,
  onTest,
}: ButtonEditorProps) {
  const [config, setConfig] = useState<ButtonConfig>(() => {
    if (initialConfig) {
      return initialConfig;
    }
    return {
      id: '', // ID будет сгенерирован backend при создании
      label: '',
      mode: 'text',
      visibility: 'both',
      permissions: ['all'],
    };
  });

  const [validationErrors, setValidationErrors] = useState<ButtonValidationError[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    // Обновляем config при изменении initialConfig
    if (initialConfig) {
      setConfig(initialConfig);
    } else {
      // Сбрасываем на пустой конфиг при создании новой кнопки
      setConfig({
        id: '', // ID будет сгенерирован backend при создании
        label: '',
        mode: 'text',
        visibility: 'both',
        permissions: ['all'],
      });
    }
  }, [initialConfig]);

  useEffect(() => {
    const errors = validateButtonConfig(config);
    setValidationErrors(errors);
  }, [config]);

  const handleSave = async () => {
    const errors = validateButtonConfig(config);
    if (errors.length > 0) {
      toast.error('Исправьте ошибки валидации перед сохранением');
      setValidationErrors(errors);
      return;
    }

    setSaving(true);
    try {
      await onSave(config);
      toast.success('Кнопка сохранена!');
    } catch (error: any) {
      toast.error(`Ошибка сохранения: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    try {
      const json = exportButtonToJSON(config);
      downloadJSON(json, `button-${config.id}.json`);
      toast.success('Конфигурация экспортирована!');
    } catch (error: any) {
      toast.error(`Ошибка экспорта: ${error.message}`);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const importedConfig = importButtonFromJSON(jsonString);
        if (importedConfig) {
          setConfig(importedConfig);
          toast.success('Конфигурация импортирована!');
        } else {
          toast.error('Неверный формат JSON');
        }
      } catch (error: any) {
        toast.error(`Ошибка импорта: ${error.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleTest = async () => {
    if (onTest) {
      try {
        await onTest(config);
        toast.success('Тест выполнен!');
      } catch (error: any) {
        toast.error(`Ошибка теста: ${error.message}`);
      }
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
        overflow: 'auto',
      }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '1400px',
          width: '100%',
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div className="modal__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="modal__title">
            {initialConfig ? 'Редактировать кнопку' : 'Создать кнопку'}
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="btn btn--secondary btn--sm"
            >
              {showPreview ? 'Скрыть превью' : 'Показать превью'}
            </button>
            <button type="button" onClick={onClose} className="btn btn--secondary btn--icon btn--sm">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          className="modal__body"
          style={{
            display: 'grid',
            gridTemplateColumns: showPreview ? 'minmax(0, 1fr) 400px' : '1fr',
            gap: '24px',
            overflow: 'auto',
            flex: 1,
          }}
        >
          {/* Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'auto', minWidth: 0 }}>
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div
                style={{
                  padding: '12px',
                  background: 'var(--error-light)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--error)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <AlertCircle size={16} style={{ color: 'var(--error)' }} />
                  <strong style={{ color: 'var(--error)' }}>Ошибки валидации:</strong>
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: 'var(--font-size-sm)' }}>
                  {validationErrors.map((error, index) => (
                    <li key={index} style={{ color: 'var(--error)', marginBottom: '4px' }}>
                      <strong>{error.field}:</strong> {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Basic Info */}
            <div className="form-group">
              <label className="form-label">Название кнопки *</label>
              <input
                type="text"
                className="form-input"
                value={config.label}
                onChange={(e) => setConfig({ ...config, label: e.target.value })}
                placeholder="Введите название кнопки"
                maxLength={64}
              />
              <small className="form-hint">
                {config.label.length}/64 символов
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Иконка (emoji)</label>
              <input
                type="text"
                className="form-input"
                value={config.icon || ''}
                onChange={(e) => setConfig({ ...config, icon: e.target.value })}
                placeholder="🛍️"
              />
              <small className="form-hint">
                Emoji иконка, которая будет отображаться перед текстом кнопки (например: 🛍️, 📋, 💰)
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">callback_data</label>
              <input
                type="text"
                className="form-input"
                value={config.callback_data || ''}
                onChange={(e) => setConfig({ ...config, callback_data: e.target.value })}
                placeholder="unique_callback_id"
                maxLength={64}
              />
              <small className="form-hint">
                Уникальный идентификатор для обработки нажатия (до 64 байт)
              </small>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Видимость</label>
                <select
                  className="form-select"
                  value={config.visibility}
                  onChange={(e) => setConfig({ ...config, visibility: e.target.value as any })}
                >
                  <option value="both">Везде</option>
                  <option value="private">Только в приватных чатах</option>
                  <option value="group">Только в группах</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Права доступа</label>
                <select
                  className="form-select"
                  value={config.permissions[0] || 'all'}
                  onChange={(e) => setConfig({ ...config, permissions: [e.target.value as any] })}
                >
                  <option value="all">Все пользователи</option>
                  <option value="moderator">Модераторы</option>
                  <option value="admin">Администраторы</option>
                </select>
              </div>
            </div>

            {/* Mode Selector */}
            <ButtonModeSelector
              value={config.mode}
              onChange={(mode) => {
                // Сброс специфичных полей при смене режима
                const updates: Partial<ButtonConfig> = { mode };
                if (mode !== 'media') updates.media = undefined;
                if (mode !== 'function') updates.function = undefined;
                if (mode !== 'submenu') updates.sections = undefined;
                setConfig({ ...config, ...updates });
              }}
            />

            {/* Mode Config */}
            <ModeConfigPanel config={config} onChange={(updates) => setConfig({ ...config, ...updates })} />

            {/* Sections Editor (для submenu) */}
            {config.mode === 'submenu' && (
              <SectionsEditor
                sections={config.sections || []}
                onChange={(sections) => setConfig({ ...config, sections })}
              />
            )}

            {/* Additional Options */}
            <div className="form-group">
              <label className="form-label">Дополнительные опции</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={config.confirm_before_action || false}
                    onChange={(e) => setConfig({ ...config, confirm_before_action: e.target.checked })}
                  />
                  <span>Требовать подтверждение перед выполнением</span>
                </label>
              </div>
            </div>
          </div>

          {/* Preview */}
          {showPreview && (
            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '24px', overflow: 'auto' }}>
              <h3 style={{ marginBottom: '16px', fontSize: 'var(--font-size-lg)' }}>Превью</h3>
              <ButtonPreview config={config} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="modal__footer"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <label className="btn btn--secondary btn--sm" style={{ cursor: 'pointer' }}>
              <Upload size={16} />
              <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
              Импорт JSON
            </label>
            <button type="button" onClick={handleExport} className="btn btn--secondary btn--sm">
              <Download size={16} />
              Экспорт JSON
            </button>
            {onTest && (
              <button type="button" onClick={handleTest} className="btn btn--secondary btn--sm">
                <TestTube size={16} />
                Тест
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn--secondary">
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn btn--primary"
              disabled={saving || validationErrors.length > 0}
            >
              <Save size={16} />
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

