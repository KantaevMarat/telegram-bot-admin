import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminsApi } from '../api/client';
import { Shield, Plus, Edit, Trash2, X, UserCheck, Crown, User, LayoutGrid, LayoutList } from 'lucide-react';
import toast from 'react-hot-toast';

interface Admin {
  id: string;
  tg_id: string;
  role: 'admin' | 'superadmin';
  username?: string;
  first_name?: string;
}

export default function AdminsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  const [formData, setFormData] = useState({
    tg_id: '',
    role: 'admin' as 'admin' | 'superadmin',
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: () => adminsApi.getAdmins(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => adminsApi.createAdmin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      handleCloseModal();
      toast.success('Администратор добавлен!');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminsApi.updateAdmin(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      handleCloseModal();
      toast.success('Администратор обновлён!');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminsApi.deleteAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast.success('Администратор удален!');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  const handleOpenModal = () => {
    setEditingAdmin(null);
    setFormData({
      tg_id: '',
      role: 'admin',
    });
    setShowModal(true);
  };

  const handleEditAdmin = (admin: Admin) => {
    setEditingAdmin(admin);
    setFormData({
      tg_id: admin.tg_id,
      role: admin.role,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAdmin(null);
    setFormData({
      tg_id: '',
      role: 'admin',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingAdmin) {
      // Для обновления отправляем только role (без tg_id)
      const updateData = { role: formData.role };
      updateMutation.mutate({ id: editingAdmin.id, data: updateData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этого администратора?')) {
      deleteMutation.mutate(id);
    }
  };

  const admins = data || [];

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-section">
            <h1 className="page-title">Администраторы</h1>
            <p className="page-subtitle">Управление администраторами системы</p>
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
          <h1 className="page-title">Администраторы</h1>
          <p className="page-subtitle">Управление администраторами системы</p>
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
            Добавить администратора
          </button>
        </div>
      </header>

      {/* Statistics */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card stat-card--info">
          <div className="stat-card__icon">
            <Shield size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{admins.length}</div>
            <div className="stat-card__label">Всего администраторов</div>
          </div>
        </div>
        
        <div className="stat-card stat-card--warning">
          <div className="stat-card__icon">
            <Crown size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{admins.filter(a => a.role === 'superadmin').length}</div>
            <div className="stat-card__label">Супер-админов</div>
          </div>
        </div>
        
        <div className="stat-card stat-card--primary">
          <div className="stat-card__icon">
            <User size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">{admins.filter(a => a.role === 'admin').length}</div>
            <div className="stat-card__label">Обычных админов</div>
          </div>
        </div>
      </div>

      {/* Admins Table or Cards */}
      {viewMode === 'table' ? (
        <div className="table-responsive">
          <div className="table-container">
            <table className="table">
            <thead className="table__head">
              <tr>
                <th className="table__cell">Администратор</th>
                <th className="table__cell">Telegram ID</th>
                <th className="table__cell table__cell--center">Роль</th>
                <th className="table__cell table__cell--center">Действия</th>
              </tr>
            </thead>
            <tbody className="table__body">
              {admins.length === 0 ? (
                <tr className="table__row">
                  <td colSpan={4} className="table__cell table__cell--empty">
                    Администраторы не найдены
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id} className="table__row">
                    <td className="table__cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '50%',
                          background: admin.role === 'superadmin' ? 'var(--warning-light)' : 'var(--accent-light)',
                          color: admin.role === 'superadmin' ? 'var(--warning)' : 'var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {admin.role === 'superadmin' ? (
                            <Crown size={20} />
                          ) : (
                            <User size={20} />
                          )}
                        </div>
                        <div>
                          <div style={{ 
                            fontWeight: 'var(--font-weight-semibold)', 
                            color: 'var(--text-primary)' 
                          }}>
                            {admin.first_name || admin.username || 'Без имени'}
                          </div>
                          {admin.username && (
                            <div style={{ 
                              fontSize: 'var(--font-size-xs)', 
                              color: 'var(--text-secondary)' 
                            }}>
                              @{admin.username}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="table__cell">
                      <span style={{ 
                        fontSize: 'var(--font-size-sm)', 
                        color: 'var(--text-secondary)',
                        fontFamily: 'monospace'
                      }}>
                        {admin.tg_id}
                      </span>
                    </td>
                    <td className="table__cell table__cell--center">
                      <span className={`badge ${admin.role === 'superadmin' ? 'badge--warning' : 'badge--primary'}`}>
                        {admin.role === 'superadmin' ? 'Супер-админ' : 'Админ'}
                      </span>
                    </td>
                    <td className="table__cell table__cell--center">
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEditAdmin(admin)}
                          className="btn btn--secondary btn--icon btn--sm"
                          title="Редактировать"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(admin.id)}
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
          {admins.length === 0 ? (
            <div className="empty-state">
              <Shield size={48} />
              <p>Администраторы не найдены</p>
            </div>
          ) : (
            admins.map((admin) => (
              <div key={admin.id} className="admin-card">
                <div className="admin-card__header">
                  <div className="admin-card__avatar">
                    {admin.role === 'superadmin' ? (
                      <Crown size={32} />
                    ) : (
                      <User size={32} />
                    )}
                  </div>
                  <div className="admin-card__info">
                    <h3 className="admin-card__name">
                      {admin.first_name || admin.username || 'Без имени'}
                    </h3>
                    <p className="admin-card__username">
                      @{admin.username || 'нет username'}
                    </p>
                  </div>
                  <span className={`badge ${admin.role === 'superadmin' ? 'badge--warning' : 'badge--primary'}`}>
                    {admin.role === 'superadmin' ? 'Супер-админ' : 'Админ'}
                  </span>
                </div>

                <div className="admin-card__stats">
                  <div className="admin-card__stat">
                    <Shield size={16} />
                    <span className="admin-card__stat-label">Telegram ID:</span>
                    <span className="admin-card__stat-value">{admin.tg_id}</span>
                  </div>
                  <div className="admin-card__stat">
                    {admin.role === 'superadmin' ? (
                      <Crown size={16} />
                    ) : (
                      <User size={16} />
                    )}
                    <span className="admin-card__stat-label">Роль:</span>
                    <span className="admin-card__stat-value">
                      {admin.role === 'superadmin' ? 'Супер-администратор' : 'Администратор'}
                    </span>
                  </div>
                </div>

                <div className="admin-card__actions">
                  <button
                    onClick={() => handleEditAdmin(admin)}
                    className="btn btn--secondary btn--sm"
                    title="Редактировать"
                  >
                    <Edit size={16} />
                    Редактировать
                  </button>
                  <button
                    onClick={() => handleDelete(admin.id)}
                    className="btn btn--danger btn--sm"
                    title="Удалить"
                    disabled={deleteMutation.isPending}
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
                {editingAdmin ? 'Редактировать администратора' : 'Добавить администратора'}
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
                  <label className="form-label">Telegram ID *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.tg_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, tg_id: e.target.value }))}
                    placeholder="Введите Telegram ID пользователя"
                    required
                  />
                  <p style={{ 
                    margin: '4px 0 0 0', 
                    fontSize: 'var(--font-size-xs)', 
                    color: 'var(--text-tertiary)' 
                  }}>
                    ID можно получить через @userinfobot
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Роль *</label>
                  <select
                    className="form-select"
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'admin' | 'superadmin' }))}
                  >
                    <option value="admin">Администратор</option>
                    <option value="superadmin">Супер-администратор</option>
                  </select>
                  <p style={{ 
                    margin: '4px 0 0 0', 
                    fontSize: 'var(--font-size-xs)', 
                    color: 'var(--text-tertiary)' 
                  }}>
                    Супер-администраторы имеют полный доступ ко всем функциям
                  </p>
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
                    <UserCheck size={16} />
                    {editingAdmin ? 'Обновить' : 'Добавить'}
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