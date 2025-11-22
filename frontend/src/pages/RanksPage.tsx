import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ranksApi, premiumApi } from '../api/client';
import { 
  Award, Settings, DollarSign, Users, TrendingUp, CheckCircle, 
  XCircle, Clock, Send, Search, Filter, Calendar, MessageSquare, LayoutGrid, LayoutList, List
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useSyncRefetch } from '../hooks/useSync';

interface RankSettings {
  id: string;
  bronze_requires_channels: boolean;
  silver_required_tasks: number;
  silver_required_referrals: number;
  gold_required_tasks: number;
  gold_required_referrals: number;
  platinum_price_usd: number;
  platinum_price_rub: number;
  platinum_price_uah: number;
  platinum_duration_days: number;
  stone_bonus: number;
  bronze_bonus: number;
  silver_bonus: number;
  gold_bonus: number;
  platinum_bonus: number;
  notification_80_percent: string;
  notification_gold_achieved: string;
  notification_weekly_reminder: string;
  notification_expiry_warning: string;
  premium_info_message: string;
  manager_username: string;
}

interface PremiumRequest {
  id: string;
  request_number: string;
  user_id: string;
  user: {
    tg_id: string;
    username: string;
    first_name: string;
    last_name: string;
  };
  payment_method: string;
  amount: number;
  currency: string;
  status: string;
  admin_notes: string;
  created_at: string;
  requisites_sent_at: string;
  payment_confirmed_at: string;
  completed_at: string;
}

export default function RanksPage() {
  const [activeTab, setActiveTab] = useState<'settings' | 'requests' | 'stats'>('requests');
  const [statusFilter, setStatusFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'list' | 'cards'>('table');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Получение настроек
  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = useQuery<RankSettings>({
    queryKey: ['rank-settings'],
    queryFn: ranksApi.getSettings,
  });

  // Получение статистики
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['rank-statistics'],
    queryFn: ranksApi.getStatistics,
  });

  // Получение запросов на подписку
  const { data: requests = [], isLoading: requestsLoading, refetch: refetchRequests } = useQuery<PremiumRequest[]>({
    queryKey: ['premium-requests', statusFilter, currencyFilter],
    queryFn: () => premiumApi.getRequests({ 
      status: statusFilter || undefined, 
      currency: currencyFilter || undefined 
    }),
  });

  // 🔄 Auto-refresh on sync events
  useSyncRefetch(['ranks.settings_updated'], () => {
    refetchSettings();
    refetchStats();
  });
  useSyncRefetch(['ranks.request_created', 'ranks.request_updated'], refetchRequests);

  // Мутация обновления настроек
  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<RankSettings>) => ranksApi.updateSettings(data),
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['rank-settings'] });
      queryClient.invalidateQueries({ queryKey: ['rank-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['user-ranks'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Настройки обновлены! Ранги пользователей будут пересчитаны.');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  // Мутации для работы с запросами
  const markRequisitesSentMutation = useMutation({
    mutationFn: (id: string) => premiumApi.markRequisitesSent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premium-requests'] });
      toast.success('Реквизиты отправлены!');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: (id: string) => premiumApi.confirmPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premium-requests'] });
      toast.success('Оплата подтверждена!');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  const activateSubscriptionMutation = useMutation({
    mutationFn: (id: string) => premiumApi.activateSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premium-requests'] });
      toast.success('Подписка активирована!');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  const cancelRequestMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => 
      premiumApi.cancelRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premium-requests'] });
      toast.success('Запрос отменен');
    },
    onError: (err: any) => toast.error(`Ошибка: ${err.response?.data?.message || err.message}`),
  });

  const handleSaveSettings = () => {
    if (settings) {
      updateSettingsMutation.mutate(settings);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { className: string; icon: JSX.Element; text: string }> = {
      new: { className: 'badge--info', icon: <Clock size={14} />, text: 'Новый' },
      in_progress: { className: 'badge--warning', icon: <Clock size={14} />, text: 'В обработке' },
      requisites_sent: { className: 'badge--warning', icon: <Send size={14} />, text: 'Реквизиты отправлены' },
      payment_confirmed: { className: 'badge--success', icon: <CheckCircle size={14} />, text: 'Оплата подтверждена' },
      completed: { className: 'badge--success', icon: <CheckCircle size={14} />, text: 'Завершено' },
      cancelled: { className: 'badge--error', icon: <XCircle size={14} />, text: 'Отменено' },
    };

    const badge = badges[status] || { className: 'badge', icon: null, text: status };
    
    return (
      <span className={`badge ${badge.className}`}>
        {badge.icon} {badge.text}
      </span>
    );
  };

  const getCurrencyBadge = (currency: string) => {
    const colors: Record<string, string> = {
      USD: 'var(--success)',
      RUB: 'var(--info)',
      UAH: 'var(--warning)',
    };

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-semibold)',
        backgroundColor: `${colors[currency]}20`,
        color: colors[currency],
      }}>
        {currency}
      </span>
    );
  };

  const getUserDisplayName = (user: any) => {
    if (user.username) return `@${user.username}`;
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || `ID: ${user.tg_id}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Фильтрация запросов
  const filteredRequests = requests.filter(req => {
    const matchesSearch = !searchQuery ||
      req.user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.user.tg_id.includes(searchQuery) ||
      req.request_number.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const newRequests = filteredRequests.filter(r => r.status === 'new');
  const inProgressRequests = filteredRequests.filter(r => 
    r.status === 'in_progress' || r.status === 'requisites_sent' || r.status === 'payment_confirmed'
  );
  const completedRequests = filteredRequests.filter(r => r.status === 'completed');

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">
            Система рангов и подписок
          </h1>
          <p className="page-subtitle">Управление рангами, платиновыми подписками и запросами на оплату</p>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px',
        borderBottom: '2px solid var(--border)',
        paddingBottom: '0'
      }}>
        <button
          className={`btn ${activeTab === 'requests' ? 'btn--primary' : 'btn--secondary'}`}
          onClick={() => setActiveTab('requests')}
          style={{
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            borderBottom: activeTab === 'requests' ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: '-2px',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: activeTab === 'requests' ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)'
          }}
        >
          <Users size={18} />
          <span>Запросы на подписку</span>
          {newRequests.length > 0 && (
            <span className="badge badge--error" style={{ marginLeft: '4px' }}>
              {newRequests.length}
            </span>
          )}
        </button>
        <button
          className={`btn ${activeTab === 'settings' ? 'btn--primary' : 'btn--secondary'}`}
          onClick={() => setActiveTab('settings')}
          style={{
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            borderBottom: activeTab === 'settings' ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: '-2px',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: activeTab === 'settings' ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)'
          }}
        >
          <Settings size={18} />
          <span>Настройки</span>
        </button>
        <button
          className={`btn ${activeTab === 'stats' ? 'btn--primary' : 'btn--secondary'}`}
          onClick={() => setActiveTab('stats')}
          style={{
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            borderBottom: activeTab === 'stats' ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: '-2px',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: activeTab === 'stats' ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)'
          }}
        >
          <TrendingUp size={18} />
          <span>Статистика</span>
        </button>
      </div>

      {/* ЗАПРОСЫ НА ПОДПИСКУ */}
      {activeTab === 'requests' && (
        <>
          {/* Stats Cards */}
          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card stat-card--warning">
              <div className="stat-card__icon">
                <Clock size={24} />
              </div>
              <div className="stat-card__content">
                <div className="stat-card__value">{newRequests.length}</div>
                <div className="stat-card__label">Новые запросы</div>
              </div>
            </div>

            <div className="stat-card stat-card--info">
              <div className="stat-card__icon">
                <Send size={24} />
              </div>
              <div className="stat-card__content">
                <div className="stat-card__value">{inProgressRequests.length}</div>
                <div className="stat-card__label">В обработке</div>
              </div>
            </div>

            <div className="stat-card stat-card--success">
              <div className="stat-card__icon">
                <CheckCircle size={24} />
              </div>
              <div className="stat-card__content">
                <div className="stat-card__value">{completedRequests.length}</div>
                <div className="stat-card__label">Завершено</div>
              </div>
            </div>

            <div className="stat-card stat-card--primary">
              <div className="stat-card__icon">
                <DollarSign size={24} />
              </div>
              <div className="stat-card__content">
                <div className="stat-card__value">
                  {completedRequests.reduce((sum, r) => sum + parseFloat(String(r.amount)), 0).toFixed(0)}
                </div>
                <div className="stat-card__label">Общий доход</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ 
            maxWidth: '100%',
            width: '100%'
          }}>
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              marginBottom: '24px', 
              alignItems: 'center',
              flexWrap: 'nowrap',
              overflowX: 'auto',
              paddingBottom: '8px'
            }}>
              <div className="search-input" style={{ flex: '1 1 auto', minWidth: '200px', maxWidth: '350px' }}>
                <Search size={18} className="search-input__icon" />
                <input
                  type="text"
                  className="search-input__field"
                  placeholder="Поиск по username, ID или номеру запроса..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ minWidth: '150px', maxWidth: '180px', flexShrink: 1 }}
                title={statusFilter ? (statusFilter === 'new' ? 'Новые' : statusFilter === 'in_progress' ? 'В обработке' : statusFilter === 'requisites_sent' ? 'Реквизиты отправлены' : statusFilter === 'payment_confirmed' ? 'Оплата подтверждена' : statusFilter === 'completed' ? 'Завершено' : statusFilter === 'cancelled' ? 'Отменено' : '') : 'Все статусы'}
              >
                <option value="">Все статусы</option>
                <option value="new">Новые</option>
                <option value="in_progress">В обработке</option>
                <option value="requisites_sent">Реквизиты отправлены</option>
                <option value="payment_confirmed">Оплата подтверждена</option>
                <option value="completed">Завершено</option>
                <option value="cancelled">Отменено</option>
              </select>

              <select
                className="form-select"
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value)}
                style={{ minWidth: '110px', maxWidth: '130px', flexShrink: 1 }}
                title={currencyFilter ? currencyFilter : 'Все валюты'}
              >
                <option value="">Все валюты</option>
                <option value="USD">USD</option>
                <option value="RUB">RUB</option>
                <option value="UAH">UAH</option>
              </select>

              <div className="view-toggle" style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button
                  onClick={() => setViewMode('table')}
                  className={`btn btn--secondary btn--sm btn--icon ${viewMode === 'table' ? 'btn--active' : ''}`}
                  title="Табличный вид"
                >
                  <LayoutList size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`btn btn--secondary btn--sm btn--icon ${viewMode === 'list' ? 'btn--active' : ''}`}
                  title="Списочный вид"
                >
                  <List size={18} />
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
          </div>

          {/* Requests Display */}
          {viewMode === 'table' ? (
          <div className="table-responsive">
            <div className="table-container">
              <table className="table">
                <thead className="table__head">
                  <tr>
                    <th className="table__cell">Номер запроса</th>
                    <th className="table__cell">Пользователь</th>
                    <th className="table__cell table__cell--center">Способ оплаты</th>
                    <th className="table__cell table__cell--center">Сумма</th>
                    <th className="table__cell">Дата создания</th>
                    <th className="table__cell table__cell--center">Статус</th>
                    <th className="table__cell table__cell--center">Действия</th>
                  </tr>
                </thead>
                <tbody className="table__body">
                  {requestsLoading ? (
                    <tr className="table__row">
                      <td colSpan={7} className="table__cell table__cell--empty">
                        Загрузка...
                      </td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr className="table__row">
                      <td colSpan={7} className="table__cell table__cell--empty">
                        Нет запросов
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((request) => (
                      <tr key={request.id} className="table__row">
                        <td className="table__cell">
                          <span style={{ fontWeight: 'var(--font-weight-semibold)', fontFamily: 'monospace' }}>
                            {request.request_number}
                          </span>
                        </td>
                        <td className="table__cell">
                          <div>
                            <div style={{ fontWeight: 'var(--font-weight-medium)' }}>
                              {getUserDisplayName(request.user)}
                            </div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                              ID: {request.user.tg_id}
                            </div>
                          </div>
                        </td>
                        <td className="table__cell table__cell--center">
                          {getCurrencyBadge(request.currency)}
                        </td>
                        <td className="table__cell table__cell--center">
                          <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                            {request.amount} {request.currency}
                          </span>
                        </td>
                        <td className="table__cell">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
                            <span style={{ fontSize: 'var(--font-size-sm)' }}>
                              {formatDate(request.created_at)}
                            </span>
                          </div>
                        </td>
                        <td className="table__cell table__cell--center">
                          {getStatusBadge(request.status)}
                        </td>
                        <td className="table__cell table__cell--center">
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {/* Кнопка чата */}
                            <button
                              onClick={() => navigate(`/chats?user=${request.user_id}`)}
                              className="btn btn--secondary btn--icon btn--sm"
                              title="Открыть чат"
                            >
                              <MessageSquare size={14} />
                            </button>

                            {/* Действия в зависимости от статуса */}
                            {request.status === 'new' && request.payment_method !== 'usd_balance' && (
                              <button
                                onClick={() => markRequisitesSentMutation.mutate(request.id)}
                                className="btn btn--info btn--sm"
                                title="Отправить реквизиты"
                                disabled={markRequisitesSentMutation.isPending}
                              >
                                <Send size={14} /> Реквизиты
                              </button>
                            )}

                            {request.status === 'requisites_sent' && (
                              <button
                                onClick={() => confirmPaymentMutation.mutate(request.id)}
                                className="btn btn--warning btn--sm"
                                title="Подтвердить оплату"
                                disabled={confirmPaymentMutation.isPending}
                              >
                                <CheckCircle size={14} /> Подтвердить
                              </button>
                            )}

                            {request.status === 'payment_confirmed' && (
                              <button
                                onClick={() => activateSubscriptionMutation.mutate(request.id)}
                                className="btn btn--success btn--sm"
                                title="Активировать подписку"
                                disabled={activateSubscriptionMutation.isPending}
                              >
                                <Award size={14} /> Активировать
                              </button>
                            )}

                            {(request.status === 'new' || request.status === 'in_progress') && (
                              <button
                                onClick={() => {
                                  const reason = prompt('Причина отмены:');
                                  if (reason !== null) {
                                    cancelRequestMutation.mutate({ id: request.id, reason });
                                  }
                                }}
                                className="btn btn--danger btn--icon btn--sm"
                                title="Отменить"
                                disabled={cancelRequestMutation.isPending}
                              >
                                <XCircle size={14} />
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
          </div>
          ) : viewMode === 'list' ? (
            <div className="users-list">
              {requestsLoading ? (
                <div className="loading">Загрузка...</div>
              ) : filteredRequests.length === 0 ? (
                <div className="empty-state">
                  <Award size={48} />
                  <p>Нет запросов</p>
                </div>
              ) : (
                filteredRequests.map((request) => (
                  <div key={request.id} className="user-card">
                    <div className="user-card__header">
                      <div className="user-card__avatar">
                        <Users size={32} />
                      </div>
                      <div className="user-card__info">
                        <h3 className="user-card__name">{getUserDisplayName(request.user)}</h3>
                        <p className="user-card__username">ID: {request.user.tg_id}</p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="user-card__stats">
                      <div className="user-card__stat">
                        <DollarSign size={16} />
                        <span className="user-card__stat-label">Сумма:</span>
                        <span className="user-card__stat-value">{request.amount} {request.currency}</span>
                      </div>
                      <div className="user-card__stat">
                        <Calendar size={16} />
                        <span className="user-card__stat-label">Дата:</span>
                        <span className="user-card__stat-value">{formatDate(request.created_at)}</span>
                      </div>
                      <div className="user-card__stat">
                        <Send size={16} />
                        <span className="user-card__stat-label">Способ:</span>
                        <span className="user-card__stat-value">{getCurrencyBadge(request.currency)}</span>
                      </div>
                    </div>

                    <div className="user-card__meta">
                      <span className="user-card__meta-item">№ {request.request_number}</span>
                      <span className="user-card__meta-item">{request.payment_method}</span>
                    </div>

                    <div className="user-card__actions">
                      <button
                        onClick={() => navigate(`/chats?user=${request.user_id}`)}
                        className="btn btn--secondary btn--sm"
                        title="Открыть чат"
                      >
                        <MessageSquare size={16} />
                        Чат
                      </button>
                      {request.status === 'new' && request.payment_method !== 'usd_balance' && (
                        <button
                          onClick={() => markRequisitesSentMutation.mutate(request.id)}
                          className="btn btn--info btn--sm"
                          title="Отправить реквизиты"
                          disabled={markRequisitesSentMutation.isPending}
                        >
                          <Send size={16} />
                          Реквизиты
                        </button>
                      )}
                      {request.status === 'requisites_sent' && (
                        <button
                          onClick={() => confirmPaymentMutation.mutate(request.id)}
                          className="btn btn--warning btn--sm"
                          title="Подтвердить оплату"
                          disabled={confirmPaymentMutation.isPending}
                        >
                          <CheckCircle size={16} />
                          Подтвердить
                        </button>
                      )}
                      {request.status === 'payment_confirmed' && (
                        <button
                          onClick={() => activateSubscriptionMutation.mutate(request.id)}
                          className="btn btn--success btn--sm"
                          title="Активировать подписку"
                          disabled={activateSubscriptionMutation.isPending}
                        >
                          <Award size={16} />
                          Активировать
                        </button>
                      )}
                      {(request.status === 'new' || request.status === 'in_progress') && (
                        <button
                          onClick={() => {
                            const reason = prompt('Причина отмены:');
                            if (reason !== null) {
                              cancelRequestMutation.mutate({ id: request.id, reason });
                            }
                          }}
                          className="btn btn--danger btn--sm"
                          title="Отменить"
                          disabled={cancelRequestMutation.isPending}
                        >
                          <XCircle size={16} />
                          Отменить
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="cards-grid">
              {requestsLoading ? (
                <div className="loading">Загрузка...</div>
              ) : filteredRequests.length === 0 ? (
                <div className="empty-state">
                  <Award size={48} />
                  <p>Нет запросов</p>
                </div>
              ) : (
                filteredRequests.map((request) => (
                  <div key={request.id} className="user-card">
                    <div className="user-card__header">
                      <div className="user-card__avatar">
                        <Users size={32} />
                      </div>
                      <div className="user-card__info">
                        <h3 className="user-card__name">{getUserDisplayName(request.user)}</h3>
                        <p className="user-card__username">ID: {request.user.tg_id}</p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="user-card__stats">
                      <div className="user-card__stat">
                        <DollarSign size={16} />
                        <span className="user-card__stat-label">Сумма:</span>
                        <span className="user-card__stat-value">{request.amount} {request.currency}</span>
                      </div>
                      <div className="user-card__stat">
                        <Calendar size={16} />
                        <span className="user-card__stat-label">Дата:</span>
                        <span className="user-card__stat-value">{formatDate(request.created_at)}</span>
                      </div>
                      <div className="user-card__stat">
                        <Send size={16} />
                        <span className="user-card__stat-label">Способ:</span>
                        <span className="user-card__stat-value">{getCurrencyBadge(request.currency)}</span>
                      </div>
                    </div>

                    <div className="user-card__meta">
                      <span className="user-card__meta-item">№ {request.request_number}</span>
                      <span className="user-card__meta-item">{request.payment_method}</span>
                    </div>

                    <div className="user-card__actions">
                      <button
                        onClick={() => navigate(`/chats?user=${request.user_id}`)}
                        className="btn btn--secondary btn--sm"
                        title="Открыть чат"
                      >
                        <MessageSquare size={16} />
                        Чат
                      </button>
                      {request.status === 'new' && request.payment_method !== 'usd_balance' && (
                        <button
                          onClick={() => markRequisitesSentMutation.mutate(request.id)}
                          className="btn btn--info btn--sm"
                          title="Отправить реквизиты"
                          disabled={markRequisitesSentMutation.isPending}
                        >
                          <Send size={16} />
                          Реквизиты
                        </button>
                      )}
                      {request.status === 'requisites_sent' && (
                        <button
                          onClick={() => confirmPaymentMutation.mutate(request.id)}
                          className="btn btn--warning btn--sm"
                          title="Подтвердить оплату"
                          disabled={confirmPaymentMutation.isPending}
                        >
                          <CheckCircle size={16} />
                          Подтвердить
                        </button>
                      )}
                      {request.status === 'payment_confirmed' && (
                        <button
                          onClick={() => activateSubscriptionMutation.mutate(request.id)}
                          className="btn btn--success btn--sm"
                          title="Активировать подписку"
                          disabled={activateSubscriptionMutation.isPending}
                        >
                          <Award size={16} />
                          Активировать
                        </button>
                      )}
                      {(request.status === 'new' || request.status === 'in_progress') && (
                        <button
                          onClick={() => {
                            const reason = prompt('Причина отмены:');
                            if (reason !== null) {
                              cancelRequestMutation.mutate({ id: request.id, reason });
                            }
                          }}
                          className="btn btn--danger btn--sm"
                          title="Отменить"
                          disabled={cancelRequestMutation.isPending}
                        >
                          <XCircle size={16} />
                          Отменить
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* НАСТРОЙКИ */}
      {activeTab === 'settings' && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={24} />
            Настройки системы рангов
          </h2>
          
          {settingsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-secondary)' }}>Загрузка настроек...</div>
            </div>
          ) : !settings ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-secondary)' }}>Настройки не найдены</div>
            </div>
          ) : (

          <div style={{ display: 'grid', gap: '32px' }}>
            {/* Требования для рангов */}
            <section>
              <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>📊 Требования для рангов</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">🥈 Серебро: Заданий</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.silver_required_tasks}
                    onChange={(e) => updateSettingsMutation.mutate({ silver_required_tasks: parseInt(e.target.value) })}
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">🥈 Серебро: Рефералов</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.silver_required_referrals}
                    onChange={(e) => updateSettingsMutation.mutate({ silver_required_referrals: parseInt(e.target.value) })}
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">🥇 Золото: Заданий</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.gold_required_tasks}
                    onChange={(e) => updateSettingsMutation.mutate({ gold_required_tasks: parseInt(e.target.value) })}
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">🥇 Золото: Рефералов</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.gold_required_referrals}
                    onChange={(e) => updateSettingsMutation.mutate({ gold_required_referrals: parseInt(e.target.value) })}
                    min="0"
                  />
                </div>
              </div>
            </section>

            {/* Бонусы */}
            <section>
              <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>💰 Процент бонусов</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {['stone', 'bronze', 'silver', 'gold', 'platinum'].map((rank) => (
                  <div key={rank} className="form-group">
                    <label className="form-label">
                      {rank === 'stone' && '🪨 Камень'}
                      {rank === 'bronze' && '🥉 Бронза'}
                      {rank === 'silver' && '🥈 Серебро'}
                      {rank === 'gold' && '🥇 Золото'}
                      {rank === 'platinum' && '💎 Платина'}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        className="form-input"
                        value={settings[`${rank}_bonus` as keyof RankSettings] as number}
                        onChange={(e) => updateSettingsMutation.mutate({ [`${rank}_bonus`]: parseFloat(e.target.value) })}
                        min="0"
                        step="0.01"
                        style={{ flex: 1 }}
                      />
                      <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold' }}>%</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Стоимость подписки */}
            <section>
              <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>💳 Стоимость Платиновой подписки</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Цена в USD (с баланса)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      className="form-input"
                      value={settings.platinum_price_usd}
                      onChange={(e) => updateSettingsMutation.mutate({ platinum_price_usd: parseFloat(e.target.value) })}
                      min="0"
                      step="0.01"
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: 'var(--font-size-sm)' }}>$</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Цена в RUB (реквизиты)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      className="form-input"
                      value={settings.platinum_price_rub}
                      onChange={(e) => updateSettingsMutation.mutate({ platinum_price_rub: parseFloat(e.target.value) })}
                      min="0"
                      step="0.01"
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: 'var(--font-size-sm)' }}>₽</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Цена в UAH (реквизиты)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      className="form-input"
                      value={settings.platinum_price_uah}
                      onChange={(e) => updateSettingsMutation.mutate({ platinum_price_uah: parseFloat(e.target.value) })}
                      min="0"
                      step="0.01"
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: 'var(--font-size-sm)' }}>₴</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Длительность (дней)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.platinum_duration_days}
                    onChange={(e) => updateSettingsMutation.mutate({ platinum_duration_days: parseInt(e.target.value) })}
                    min="1"
                  />
                </div>
              </div>
            </section>

            {/* Другие настройки */}
            <section>
              <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>⚙️ Прочие настройки</h3>
              
              <div className="form-group">
                <label className="form-label">Username менеджера</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.manager_username || ''}
                  onChange={(e) => updateSettingsMutation.mutate({ manager_username: e.target.value })}
                  placeholder="@manager_username"
                />
                <small className="form-hint">Без символа @</small>
              </div>
            </section>

            {/* Шаблоны уведомлений */}
            <section>
              <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>📬 Шаблоны уведомлений</h3>
              
              <div style={{ display: 'grid', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Уведомление о 80% прогресса</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={settings.notification_80_percent || ''}
                    onChange={(e) => updateSettingsMutation.mutate({ notification_80_percent: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Уведомление о достижении Золота</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={settings.notification_gold_achieved || ''}
                    onChange={(e) => updateSettingsMutation.mutate({ notification_gold_achieved: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Еженедельное напоминание</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={settings.notification_weekly_reminder || ''}
                    onChange={(e) => updateSettingsMutation.mutate({ notification_weekly_reminder: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Предупреждение об истечении подписки</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={settings.notification_expiry_warning || ''}
                    onChange={(e) => updateSettingsMutation.mutate({ notification_expiry_warning: e.target.value })}
                  />
                </div>
              </div>
            </section>
          </div>
          )}
        </div>
      )}

      {/* СТАТИСТИКА */}
      {activeTab === 'stats' && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={24} />
            Статистика рангов
          </h2>

          {!stats ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-secondary)' }}>Загрузка статистики...</div>
            </div>
          ) : (
            <>
          <div className="stats-grid">
            {stats.byRank?.map((stat: any) => (
              <div key={stat.rank} className="stat-card">
                <div className="stat-card__icon">
                  <Award size={24} />
                </div>
                <div className="stat-card__content">
                  <div className="stat-card__value">{stat.count}</div>
                  <div className="stat-card__label">
                    {stat.rank === 'stone' && '🪨 Камень'}
                    {stat.rank === 'bronze' && '🥉 Бронза'}
                    {stat.rank === 'silver' && '🥈 Серебро'}
                    {stat.rank === 'gold' && '🥇 Золото'}
                    {stat.rank === 'platinum' && '💎 Платина'}
                  </div>
                </div>
              </div>
            ))}

            <div className="stat-card stat-card--primary">
              <div className="stat-card__icon">
                <Award size={24} />
              </div>
              <div className="stat-card__content">
                <div className="stat-card__value">{stats.platinumActive || 0}</div>
                <div className="stat-card__label">Активных Platinum</div>
              </div>
            </div>

            <div className="stat-card stat-card--info">
              <div className="stat-card__icon">
                <Users size={24} />
              </div>
              <div className="stat-card__content">
                <div className="stat-card__value">{stats.total || 0}</div>
                <div className="stat-card__label">Всего пользователей</div>
              </div>
            </div>
          </div>

          {/* Дополнительная статистика по запросам */}
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ marginBottom: '16px' }}>💳 Статистика оплат</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="stat-card">
                <div className="stat-card__content">
                  <div className="stat-card__value">
                    {requests.filter(r => r.currency === 'USD').length}
                  </div>
                  <div className="stat-card__label">Оплаты в USD</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card__content">
                  <div className="stat-card__value">
                    {requests.filter(r => r.currency === 'RUB').length}
                  </div>
                  <div className="stat-card__label">Оплаты в RUB</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card__content">
                  <div className="stat-card__value">
                    {requests.filter(r => r.currency === 'UAH').length}
                  </div>
                  <div className="stat-card__label">Оплаты в UAH</div>
                </div>
              </div>
            </div>
          </div>
          </>
          )}
        </div>
      )}
    </div>
  );
}

