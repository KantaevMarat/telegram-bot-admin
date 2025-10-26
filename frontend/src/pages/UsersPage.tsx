import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, balanceApi } from '../api/client';
import { Search, Filter, Eye, DollarSign, TrendingUp, Users, X, Plus, Minus, ChevronLeft, ChevronRight, User, LayoutGrid, LayoutList, Lock, Unlock, ShieldOff, Shield, Download, Check, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [balanceAction, setBalanceAction] = useState<'add' | 'subtract' | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceReason, setBalanceReason] = useState('');
  const [showBalanceHistory, setShowBalanceHistory] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [sortBy, setSortBy] = useState<'registered_at' | 'balance_usdt' | 'tasks_completed' | 'total_earned' | 'first_name'>('registered_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const queryClient = useQueryClient();

  // Debounce search input
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);


  const { data, isLoading } = useQuery({
    queryKey: ['users', page, debouncedSearch, statusFilter],
    queryFn: () => usersApi.getUsers({ page, search: debouncedSearch, status: statusFilter === 'all' ? undefined : statusFilter }),
    placeholderData: (previousData) => previousData,
  });

  const { data: balanceHistory } = useQuery({
    queryKey: ['balance-logs', selectedUser?.id],
    queryFn: () => selectedUser ? usersApi.getBalanceLogs(selectedUser.id, 20) : [],
    enabled: !!selectedUser?.id && showBalanceHistory,
  });

  const balanceMutation = useMutation({
    mutationFn: ({ tg_id, amount, reason }: { tg_id: string; amount: number; reason: string }) =>
      balanceApi.adjustBalance(tg_id, amount, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['balance-overview'] });
      queryClient.invalidateQueries({ queryKey: ['balance-logs'] });
      closeBalanceAction();
      toast.success('Баланс успешно обновлён!');
    },
    onError: () => toast.error('Ошибка при обновлении баланса')
  });

  const blockMutation = useMutation({
    mutationFn: (id: string) => usersApi.blockUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Пользователь заблокирован!');
    },
    onError: () => toast.error('Ошибка при блокировке пользователя')
  });

  const unblockMutation = useMutation({
    mutationFn: (id: string) => usersApi.unblockUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Пользователь разблокирован!');
    },
    onError: () => toast.error('Ошибка при разблокировке пользователя')
  });

  const bulkBlockMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(id => usersApi.blockUser(id))),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedUsers([]);
      setShowBulkActions(false);
      toast.success(`Заблокировано ${ids.length} пользователей!`);
    },
    onError: () => toast.error('Ошибка при массовой блокировке')
  });

  const bulkUnblockMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(id => usersApi.unblockUser(id))),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedUsers([]);
      setShowBulkActions(false);
      toast.success(`Разблокировано ${ids.length} пользователей!`);
    },
    onError: () => toast.error('Ошибка при массовой разблокировке')
  });

  const handleBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !balanceAmount || !balanceReason) return;
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Введите корректную сумму');
      return;
    }

    const finalAmount = balanceAction === 'subtract' ? -amount : amount;
    balanceMutation.mutate({
      tg_id: selectedUser.tg_id,
      amount: finalAmount,
      reason: balanceReason,
    });
  };

  const handleBlockUser = (id: string) => {
    if (confirm('Вы уверены, что хотите заблокировать этого пользователя?')) {
      blockMutation.mutate(id);
    }
  };

  const handleUnblockUser = (id: string) => {
    if (confirm('Вы уверены, что хотите разблокировать этого пользователя?')) {
      unblockMutation.mutate(id);
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(sortedUsers.map((user: any) => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleBulkBlock = () => {
    if (selectedUsers.length === 0) return;
    if (confirm(`Вы уверены, что хотите заблокировать ${selectedUsers.length} пользователей?`)) {
      bulkBlockMutation.mutate(selectedUsers);
    }
  };

  const handleBulkUnblock = () => {
    if (selectedUsers.length === 0) return;
    if (confirm(`Вы уверены, что хотите разблокировать ${selectedUsers.length} пользователей?`)) {
      bulkUnblockMutation.mutate(selectedUsers);
    }
  };
  
  const openModal = (user: any) => {
    setSelectedUser(user);
    setShowModal(true);
  }

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    closeBalanceAction();
  }
  
  const closeBalanceAction = () => {
    setBalanceAction(null);
    setBalanceAmount('');
    setBalanceReason('');
  }

  const totalPages = data?.totalPages || 1;
  const users = Array.isArray(data) ? data : (data?.data || []);

  // Sort users
  const sortedUsers = [...users].sort((a: any, b: any) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    if (sortBy === 'registered_at') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    } else if (sortBy === 'first_name') {
      aValue = (a.first_name || a.username || 'Аноним').toLowerCase();
      bValue = (b.first_name || b.username || 'Аноним').toLowerCase();
    } else {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
  });

  return (
    <div className="fade-in users-page">
      {/* Page Header */}
      <header className="users-page__header">
        <div className="users-page__header-content">
          <div className="users-page__title-section">
            <h1 className="users-page__title">Пользователи</h1>
            <p className="users-page__subtitle">Управление пользователями системы</p>
          </div>
          
          <div className="users-page__actions">
            <button
              onClick={() => {
                setSelectedUsers(sortedUsers.filter((u: any) => u.status === 'active').map((u: any) => u.id));
                setShowBulkActions(true);
              }}
              className="btn btn--secondary btn--sm"
            >
              Выбрать активных
            </button>
            <button
              onClick={() => {
                setSelectedUsers(sortedUsers.filter((u: any) => u.status === 'blocked').map((u: any) => u.id));
                setShowBulkActions(true);
              }}
              className="btn btn--secondary btn--sm"
            >
              Выбрать заблокированных
            </button>
            <button
              onClick={() => {
                toast('Функция создания пользователя будет добавлена в следующих обновлениях', {
                  icon: 'ℹ️',
                  duration: 4000,
                });
              }}
              className="btn btn--primary btn--sm"
            >
              + Новый пользователь
            </button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="users-page__stats">
          <div className="stat-card">
            <div className="stat-card__icon">
              <Users size={20} />
            </div>
            <div className="stat-card__content">
              <div className="stat-card__value">{data?.total || 0}</div>
              <div className="stat-card__label">Всего</div>
            </div>
          </div>

          <div className="stat-card stat-card--success">
            <div className="stat-card__icon">
              <div className="stat-card__dot stat-card__dot--success"></div>
            </div>
            <div className="stat-card__content">
              <div className="stat-card__value stat-card__value--success">
                {sortedUsers.filter((u: any) => u.status === 'active').length}
              </div>
              <div className="stat-card__label">Активные</div>
            </div>
          </div>

          <div className="stat-card stat-card--error">
            <div className="stat-card__icon">
              <div className="stat-card__dot stat-card__dot--error"></div>
            </div>
            <div className="stat-card__content">
              <div className="stat-card__value stat-card__value--error">
                {sortedUsers.filter((u: any) => u.status === 'blocked').length}
              </div>
              <div className="stat-card__label">Заблокированные</div>
            </div>
          </div>
        </div>
      </header>

      {/* Filters Section */}
      <section className="users-page__filters">
        <div className="users-page__search">
          <div className="search-input">
            <Search size={18} className="search-input__icon" />
            <input
              type="text"
              placeholder="Поиск по username, Telegram ID, имени..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input__field"
            />
          </div>
        </div>

        <div className="users-page__filter-controls">
          <div className="filter-group">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="blocked">Заблокированные</option>
            </select>
          </div>

          <div className="filter-group">
            <div className="filter-buttons">
              <button
                onClick={() => setStatusFilter('all')}
                className={`btn btn--secondary btn--sm ${statusFilter === 'all' ? 'btn--active' : ''}`}
              >
                Все ({data?.total || 0})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`btn btn--success btn--sm ${statusFilter === 'active' ? 'btn--active' : ''}`}
              >
                Активные
              </button>
              <button
                onClick={() => setStatusFilter('blocked')}
                className={`btn btn--danger btn--sm ${statusFilter === 'blocked' ? 'btn--active' : ''}`}
              >
                Заблокированные
              </button>
            </div>
          </div>

          <div className="filter-group">
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
          </div>

          <div className="filter-group">
            <button
              onClick={() => {
                const csvContent = "data:text/csv;charset=utf-8,"
                  + "Имя,Username,Telegram ID,Баланс,Заданий,Статус,Дата регистрации\n"
                  + sortedUsers.map((user: any) =>
                      `${user.first_name || ''},${user.username || ''},${user.tg_id},${user.balance_usdt || 0},${user.tasks_completed || 0},${user.status},${new Date(user.registered_at).toLocaleDateString('ru-RU')}`
                    ).join("\n");

                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `users_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="btn btn--secondary btn--sm"
            >
              <Download size={16} />
              Экспорт CSV
            </button>
          </div>
        </div>
      </section>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <section className="users-page__bulk-actions">
          <div className="bulk-actions">
            <div className="bulk-actions__info">
              <span className="bulk-actions__count">
                Выбрано: {selectedUsers.length} пользователей
              </span>
              <button
                onClick={() => setSelectedUsers([])}
                className="btn btn--secondary btn--sm"
              >
                Очистить
              </button>
            </div>
            <div className="bulk-actions__controls">
              <button
                onClick={handleBulkBlock}
                className="btn btn--danger btn--sm"
                disabled={bulkBlockMutation.isPending}
              >
                <ShieldOff size={16} />
                {bulkBlockMutation.isPending ? 'Блокирую...' : 'Заблокировать'}
              </button>
              <button
                onClick={handleBulkUnblock}
                className="btn btn--success btn--sm"
                disabled={bulkUnblockMutation.isPending}
              >
                <Shield size={16} />
                {bulkUnblockMutation.isPending ? 'Разблокирую...' : 'Разблокировать'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Users Table or Cards */}
      <section className="users-page__content">
        {viewMode === 'table' ? (
          <div className="table-container">
            <table className="users-table">
            <thead className="users-table__head">
              <tr className="users-table__row">
                <th className="users-table__cell users-table__cell--checkbox">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === sortedUsers.length && sortedUsers.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="checkbox"
                  />
                </th>
                <th 
                  className="users-table__cell users-table__cell--sortable users-table__cell--user"
                  onClick={() => {
                    if (sortBy === 'first_name') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('first_name');
                      setSortOrder('asc');
                    }
                  }}
                >
                  Пользователь {sortBy === 'first_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="users-table__cell users-table__cell--tg-id">Telegram ID</th>
                <th 
                  className="users-table__cell users-table__cell--sortable users-table__cell--balance"
                  onClick={() => {
                    if (sortBy === 'balance_usdt') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('balance_usdt');
                      setSortOrder('desc');
                    }
                  }}
                >
                  Баланс {sortBy === 'balance_usdt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="users-table__cell users-table__cell--sortable users-table__cell--tasks"
                  onClick={() => {
                    if (sortBy === 'tasks_completed') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('tasks_completed');
                      setSortOrder('desc');
                    }
                  }}
                >
                  Заданий {sortBy === 'tasks_completed' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="users-table__cell users-table__cell--status">Статус</th>
                <th 
                  className="users-table__cell users-table__cell--sortable users-table__cell--date"
                  onClick={() => {
                    if (sortBy === 'registered_at') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('registered_at');
                      setSortOrder('desc');
                    }
                  }}
                >
                  Дата {sortBy === 'registered_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="users-table__cell users-table__cell--actions">Действия</th>
              </tr>
            </thead>
            <tbody className="users-table__body">
              {isLoading && users.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="users-table__row">
                    <td colSpan={8} className="users-table__cell users-table__cell--loading">
                       <div className="loading-skeleton"></div>
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr className="users-table__row">
                  <td colSpan={8} className="users-table__cell users-table__cell--empty">
                    Пользователи не найдены
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user: any) => (
                  <tr key={user.id} className="users-table__row">
                    <td className="users-table__cell users-table__cell--checkbox">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                        className="checkbox"
                      />
                    </td>
                    <td className="users-table__cell users-table__cell--user">
                      <div className="user-info">
                        <div className="user-info__name">
                          {user.first_name || user.username || 'Аноним'}
                        </div>
                        {user.username && (
                          <div className="user-info__username">@{user.username}</div>
                        )}
                      </div>
                    </td>
                    <td className="users-table__cell users-table__cell--tg-id">
                      <span className="tg-id">{user.tg_id}</span>
                    </td>
                    <td className="users-table__cell users-table__cell--balance">
                      <span className="balance-value">
                        ${parseFloat(user.balance_usdt || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="users-table__cell users-table__cell--tasks">
                      <span className="tasks-count">{user.tasks_completed || 0}</span>
                    </td>
                    <td className="users-table__cell users-table__cell--status">
                      <span className={`badge ${user.status === 'active' ? 'badge--success' : 'badge--danger'}`}>
                        {user.status === 'active' ? <><Check size={14} /> Активен</> : <><XCircle size={14} /> Заблокирован</>}
                      </span>
                    </td>
                    <td className="users-table__cell users-table__cell--date">
                      <span className="date-value">
                        {new Date(user.registered_at).toLocaleDateString('ru-RU')}
                      </span>
                    </td>
                    <td className="users-table__cell users-table__cell--actions">
                      <div className="action-buttons">
                        <button
                          onClick={() => openModal(user)}
                          className="btn btn--secondary btn--icon"
                          title="Просмотреть профиль"
                        >
                          <Eye size={16} />
                        </button>
                        {user.status === 'active' ? (
                          <button
                            onClick={() => handleBlockUser(user.id)}
                            className="btn btn--danger btn--icon"
                            title="Заблокировать пользователя"
                            disabled={blockMutation.isPending}
                          >
                            <Lock size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnblockUser(user.id)}
                            className="btn btn--success btn--icon"
                            title="Разблокировать пользователя"
                            disabled={unblockMutation.isPending}
                          >
                            <Unlock size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        ) : (
          <div className="users-cards">
            {isLoading ? (
              <div className="loading">Загрузка...</div>
            ) : sortedUsers.length === 0 ? (
              <div className="empty-state">
                <User size={48} />
                <p>Пользователи не найдены</p>
              </div>
            ) : (
              sortedUsers.map((user: any) => (
                <div key={user.id} className="user-card">
                  <div className="user-card__header">
                    <div className="user-card__avatar">
                      <User size={32} />
                    </div>
                    <div className="user-card__info">
                      <h3 className="user-card__name">{user.first_name || 'Без имени'}</h3>
                      <p className="user-card__username">@{user.username || 'нет username'}</p>
                    </div>
                    <span className={`badge ${user.status === 'active' ? 'badge--success' : 'badge--error'}`}>
                      {user.status === 'active' ? 'Активен' : 'Заблокирован'}
                    </span>
                  </div>

                  <div className="user-card__stats">
                    <div className="user-card__stat">
                      <DollarSign size={16} />
                      <span className="user-card__stat-label">Баланс:</span>
                      <span className="user-card__stat-value">${parseFloat(user.balance_usdt || '0').toFixed(2)}</span>
                    </div>
                    <div className="user-card__stat">
                      <TrendingUp size={16} />
                      <span className="user-card__stat-label">Заработано:</span>
                      <span className="user-card__stat-value">${parseFloat(user.total_earned || '0').toFixed(2)}</span>
                    </div>
                    <div className="user-card__stat">
                      <Users size={16} />
                      <span className="user-card__stat-label">Заданий:</span>
                      <span className="user-card__stat-value">{user.tasks_completed || 0}</span>
                    </div>
                  </div>

                  <div className="user-card__meta">
                    <span className="user-card__meta-item">ID: {user.tg_id}</span>
                    <span className="user-card__meta-item">
                      {new Date(user.registered_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>

                  <div className="user-card__actions">
                    <button
                      onClick={() => openModal(user)}
                      className="btn btn--secondary btn--sm"
                      title="Просмотреть профиль"
                    >
                      <Eye size={16} />
                      Просмотр
                    </button>
                    {user.status === 'active' ? (
                      <button
                        onClick={() => handleBlockUser(user.id)}
                        className="btn btn--danger btn--sm"
                        title="Заблокировать пользователя"
                        disabled={blockMutation.isPending}
                      >
                        <Lock size={16} />
                        Заблокировать
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnblockUser(user.id)}
                        className="btn btn--success btn--sm"
                        title="Разблокировать пользователя"
                        disabled={unblockMutation.isPending}
                      >
                        <Unlock size={16} />
                        Разблокировать
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination__controls">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn--secondary btn--sm"
              >
                <ChevronLeft size={16} />
                Назад
              </button>

              <span className="pagination__info">
                Страница {page} из {totalPages}
              </span>

              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages}
                className="btn btn--secondary btn--sm"
              >
                Вперёд
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="pagination__meta">
              <span className="pagination__count">
                Показывается {sortedUsers.length} из {data?.total || 0} пользователей
              </span>

              <select
                value={20}
                onChange={(e) => {
                  console.log('Limit changed to:', e.target.value);
                }}
                className="pagination__limit"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}
      </section>

      {/* User Details Modal */}
      {showModal && selectedUser && (
        <div className="modal-overlay" onClick={closeModal}>
          <div 
            className="modal fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal__header">
              <h2 className="modal__title">Профиль пользователя</h2>
              <button onClick={closeModal} className="btn btn--secondary btn--icon">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal__body">
              {/* User Info */}
              <div className="user-details">
                <div className="user-details__grid">
                  <div className="user-details__row">
                    <span className="user-details__label">Имя:</span>
                    <span className="user-details__value">{selectedUser.first_name || '-'}</span>
                  </div>
                  <div className="user-details__row">
                    <span className="user-details__label">Username:</span>
                    <span className="user-details__value">@{selectedUser.username || '-'}</span>
                  </div>
                  <div className="user-details__row">
                    <span className="user-details__label">Telegram ID:</span>
                    <span className="user-details__value user-details__value--mono">{selectedUser.tg_id}</span>
                  </div>
                  <div className="user-details__row">
                    <span className="user-details__label">Статус:</span>
                    <span className={`badge ${selectedUser.status === 'active' ? 'badge--success' : 'badge--error'}`}>
                      {selectedUser.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Balance */}
              <div className="balance-section">
                <h3 className="balance-section__title">Баланс</h3>
                <div className="balance-display">
                  <div className="balance-display__amount">
                    ${parseFloat(selectedUser.balance_usdt || 0).toFixed(2)}
                  </div>
                </div>

                {!balanceAction && (
                  <div className="balance-actions">
                    <button
                      onClick={() => setBalanceAction('add')}
                      className="btn btn--success btn--full"
                    >
                      <Plus size={16} />
                      Пополнить
                    </button>
                    <button
                      onClick={() => setBalanceAction('subtract')}
                      className="btn btn--danger btn--full"
                    >
                      <Minus size={16} />
                      Списать
                    </button>
                  </div>
                )}

                {balanceAction && (
                  <form onSubmit={handleBalanceSubmit} className="balance-form">
                    <h4 className="balance-form__title">
                      {balanceAction === 'add' ? 'Пополнение баланса' : 'Списание баланса'}
                    </h4>
                    <div className="balance-form__fields">
                      <input
                        type="number"
                        placeholder="Сумма"
                        value={balanceAmount}
                        onChange={(e) => setBalanceAmount(e.target.value)}
                        step="0.01"
                        required
                        className="balance-form__input"
                      />
                      <input
                        type="text"
                        placeholder="Причина"
                        value={balanceReason}
                        onChange={(e) => setBalanceReason(e.target.value)}
                        required
                        className="balance-form__input"
                      />
                      <div className="balance-form__actions">
                        <button
                          type="submit"
                          className={`btn ${balanceAction === 'add' ? 'btn--success' : 'btn--danger'}`}
                          disabled={balanceMutation.isPending}
                        >
                          {balanceMutation.isPending ? 'Обработка...' : 'Подтвердить'}
                        </button>
                        <button
                          type="button"
                          onClick={closeBalanceAction}
                          className="btn btn--secondary"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Stats */}
              <div className="stats-section">
                <div className="stats-section__header">
                  <h3 className="stats-section__title">Статистика</h3>
                  <button
                    onClick={() => setShowBalanceHistory(!showBalanceHistory)}
                    className="btn btn--secondary btn--sm"
                  >
                    {showBalanceHistory ? 'Скрыть историю' : 'История баланса'}
                  </button>
                </div>
                <div className="stats-grid">
                  <div className="stat-item">
                    <TrendingUp size={20} className="stat-item__icon" />
                    <div className="stat-item__value">{selectedUser.tasks_completed || 0}</div>
                    <div className="stat-item__label">Заданий</div>
                  </div>
                  <div className="stat-item">
                    <DollarSign size={20} className="stat-item__icon" />
                    <div className="stat-item__value">${parseFloat(selectedUser.total_earned || 0).toFixed(2)}</div>
                    <div className="stat-item__label">Заработано</div>
                  </div>
                </div>

                {/* Balance History */}
                {showBalanceHistory && (
                  <div className="balance-history">
                    <h4 className="balance-history__title">История операций</h4>
                    <div className="balance-history__container">
                      {!balanceHistory || balanceHistory.length === 0 ? (
                        <p className="balance-history__empty">
                          История операций пуста
                        </p>
                      ) : (
                        <div className="balance-history__list">
                          {balanceHistory.map((log: any, index: number) => (
                            <div key={index} className="balance-history__item">
                              <div className="balance-history__info">
                                <span className={`balance-history__amount ${log.delta > 0 ? 'balance-history__amount--positive' : 'balance-history__amount--negative'}`}>
                                  {log.delta > 0 ? '+' : ''}${log.delta}
                                </span>
                                <span className="balance-history__reason">
                                  {log.reason}
                                </span>
                              </div>
                              <span className="balance-history__date">
                                {new Date(log.created_at).toLocaleDateString('ru-RU')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

