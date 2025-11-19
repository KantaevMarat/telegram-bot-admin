import { useState } from 'react';
import { Section, SubButton, ButtonMode } from '../../types/button.types';
import { Plus, Trash2, ChevronUp, ChevronDown, Edit, X } from 'lucide-react';
import ButtonModeSelector from './ButtonModeSelector';
import ModeConfigPanel from './ModeConfigPanel';

interface SectionsEditorProps {
  sections: Section[];
  onChange: (sections: Section[]) => void;
}

export default function SectionsEditor({ sections, onChange }: SectionsEditorProps) {
  const [editingSubButton, setEditingSubButton] = useState<{ sectionId: string; buttonId: string } | null>(null);

  const addSection = () => {
    const newSection: Section = {
      id: `sec_${Date.now()}`,
      title: `Раздел ${sections.length + 1}`,
      subbuttons: [],
    };
    onChange([...sections, newSection]);
  };

  const updateSection = (sectionId: string, updates: Partial<Section>) => {
    onChange(
      sections.map((section) => (section.id === sectionId ? { ...section, ...updates } : section))
    );
  };

  const deleteSection = (sectionId: string) => {
    if (window.confirm('Удалить раздел и все подкнопки?')) {
      onChange(sections.filter((section) => section.id !== sectionId));
    }
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const index = sections.findIndex((s) => s.id === sectionId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    const newSections = [...sections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    onChange(newSections);
  };

  const addSubButton = (sectionId: string) => {
    const newSubButton: SubButton = {
      id: `btn_${Date.now()}_${Math.random()}`,
      label: 'Новая кнопка',
      mode: 'text',
    };
    onChange(
      sections.map((section) =>
        section.id === sectionId
          ? { ...section, subbuttons: [...section.subbuttons, newSubButton] }
          : section
      )
    );
    setEditingSubButton({ sectionId, buttonId: newSubButton.id });
  };

  const updateSubButton = (sectionId: string, buttonId: string, updates: Partial<SubButton>) => {
    onChange(
      sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              subbuttons: section.subbuttons.map((btn) =>
                btn.id === buttonId ? { ...btn, ...updates } : btn
              ),
            }
          : section
      )
    );
  };

  const deleteSubButton = (sectionId: string, buttonId: string) => {
    if (window.confirm('Удалить подкнопку?')) {
      onChange(
        sections.map((section) =>
          section.id === sectionId
            ? { ...section, subbuttons: section.subbuttons.filter((btn) => btn.id !== buttonId) }
            : section
        )
      );
    }
  };

  const moveSubButton = (sectionId: string, buttonId: string, direction: 'up' | 'down') => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    const index = section.subbuttons.findIndex((b) => b.id === buttonId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= section.subbuttons.length) return;

    const newSubButtons = [...section.subbuttons];
    [newSubButtons[index], newSubButtons[newIndex]] = [newSubButtons[newIndex], newSubButtons[index]];

    onChange(
      sections.map((s) => (s.id === sectionId ? { ...s, subbuttons: newSubButtons } : s))
    );
  };

  const getEditingSubButton = (): SubButton | null => {
    if (!editingSubButton) return null;
    const section = sections.find((s) => s.id === editingSubButton.sectionId);
    if (!section) return null;
    return section.subbuttons.find((b) => b.id === editingSubButton.buttonId) || null;
  };

  const editingButton = getEditingSubButton();

  return (
    <div className="form-group">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <label className="form-label">Разделы и подкнопки</label>
        <button type="button" onClick={addSection} className="btn btn--secondary btn--sm">
          <Plus size={16} />
          Добавить раздел
        </button>
      </div>

      {sections.length === 0 ? (
        <div
          style={{
            padding: '32px',
            textAlign: 'center',
            background: 'var(--background-secondary)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
          }}
        >
          <p>Нет разделов. Нажмите "Добавить раздел" чтобы создать.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sections.map((section, sectionIndex) => (
            <div
              key={section.id}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                background: 'var(--background)',
              }}
            >
              {/* Section Header */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  className="form-input"
                  value={section.title}
                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                  placeholder="Название раздела"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => moveSection(section.id, 'up')}
                  className="btn btn--secondary btn--icon btn--sm"
                  disabled={sectionIndex === 0}
                  title="Вверх"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(section.id, 'down')}
                  className="btn btn--secondary btn--icon btn--sm"
                  disabled={sectionIndex === sections.length - 1}
                  title="Вниз"
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteSection(section.id)}
                  className="btn btn--danger btn--icon btn--sm"
                  title="Удалить раздел"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* SubButtons List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {section.subbuttons.map((subButton, buttonIndex) => (
                  <div
                    key={subButton.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      background: 'var(--background-secondary)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                        {buttonIndex + 1}.
                      </span>
                      <span style={{ flex: 1, fontSize: 'var(--font-size-sm)' }}>{subButton.label}</span>
                      <span
                        className="badge badge--info"
                        style={{ fontSize: 'var(--font-size-xs)' }}
                      >
                        {subButton.mode}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => moveSubButton(section.id, subButton.id, 'up')}
                      className="btn btn--secondary btn--icon btn--sm"
                      disabled={buttonIndex === 0}
                      title="Вверх"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSubButton(section.id, subButton.id, 'down')}
                      className="btn btn--secondary btn--icon btn--sm"
                      disabled={buttonIndex === section.subbuttons.length - 1}
                      title="Вниз"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSubButton({ sectionId: section.id, buttonId: subButton.id })}
                      className="btn btn--secondary btn--icon btn--sm"
                      title="Редактировать"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSubButton(section.id, subButton.id)}
                      className="btn btn--danger btn--icon btn--sm"
                      title="Удалить"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addSubButton(section.id)}
                className="btn btn--secondary btn--sm"
                style={{ width: '100%' }}
              >
                <Plus size={16} />
                Добавить подкнопку
              </button>
            </div>
          ))}
        </div>
      )}

      {/* SubButton Editor Modal */}
      {editingButton && editingSubButton && (
        <div
          className="modal-overlay"
          onClick={() => setEditingSubButton(null)}
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
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}
          >
            <div className="modal__header">
              <h3 className="modal__title">Редактировать подкнопку</h3>
              <button
                type="button"
                onClick={() => setEditingSubButton(null)}
                className="btn btn--secondary btn--icon btn--sm"
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal__body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Название</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingButton.label}
                    onChange={(e) =>
                      updateSubButton(editingSubButton.sectionId, editingSubButton.buttonId, {
                        label: e.target.value,
                      })
                    }
                    placeholder="Название подкнопки"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Иконка (emoji)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingButton.icon || ''}
                    onChange={(e) =>
                      updateSubButton(editingSubButton.sectionId, editingSubButton.buttonId, {
                        icon: e.target.value,
                      })
                    }
                    placeholder="🛍️"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">callback_data</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingButton.callback_data || ''}
                    onChange={(e) =>
                      updateSubButton(editingSubButton.sectionId, editingSubButton.buttonId, {
                        callback_data: e.target.value,
                      })
                    }
                    placeholder="unique_callback_id"
                  />
                </div>

                <ButtonModeSelector
                  value={editingButton.mode}
                  onChange={(mode) =>
                    updateSubButton(editingSubButton.sectionId, editingSubButton.buttonId, { mode })
                  }
                />

                <ModeConfigPanel
                  config={editingButton as any}
                  onChange={(updates) =>
                    updateSubButton(editingSubButton.sectionId, editingSubButton.buttonId, updates as any)
                  }
                />
              </div>
            </div>
            <div className="modal__footer" style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => setEditingSubButton(null)}
                className="btn btn--primary"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

