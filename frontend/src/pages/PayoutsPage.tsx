import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payoutsApi } from '../api/client';
import toast from 'react-hot-toast';
import { FileText, Check, X, Filter, Search, Download, Eye, DollarSign, Clock, CheckCircle, XCircle, Calendar, Wallet, Users, TrendingUp, AlertCircle } from 'lucide-react';

export default function PayoutsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPayoutDetails, setShowPayoutDetails] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('all');
  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['payouts', statusFilter],
    queryFn: () => payoutsApi.getPayouts({ status: statusFilter === 'all' ? undefined : statusFilter }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => payoutsApi.approvePayout(id),
    onSuccess: () => {
      toast.success('Заявка одобрена');
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
    },
    onError: () => toast.error('Ошибка при одобрении заявки')
  });

  const declineMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      payoutsApi.declinePayout(id, reason),
    onSuccess: () => {
      toast.success('Заявка отклонена');
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      setShowDeclineModal(false);
      setDeclineReason('');
    },
    onError: () => toast.error('Ошибка при отклонении заявки')
  });

  const handleDeclineClick = (id: string) => {
    setSelectedPayoutId(id);
    setShowDeclineModal(true);
  };

  const handleConfirmDecline = () => {
    if (selectedPayoutId && declineReason) {
      declineMutation.mutate({ id: selectedPayoutId, reason: declineReason });
    } else {
      toast.error('Укажите причину отклонения');
    }
  };

  const handleViewDetails = (payout: any) => {
    setSelectedPayout(payout);
    setShowPayoutDetails(true);
  };

  const handleExportPayouts = () => {
    try {
      // Подготовка данных для экспорта
      const dataToExport = filteredPayouts.map((p: any) => ({
        'ID': p.id,
        'Пользователь': p.user?.username || p.user?.first_name || 'Без имени',
        'Telegram ID': p.user?.tg_id || '',
        'Сумма (USDT)': p.amount_usdt || '0',
        'Кошелёк': p.wallet_address || '',
        'Статус': p.status === 'pending' ? 'Ожидает' : 
                  p.status === 'approved' ? 'Одобрено' : 
                  p.status === 'declined' ? 'Отклонено' : 
                  p.status === 'completed' ? 'Выполнено' : p.status,
        'Дата создания': p.created_at ? new Date(p.created_at).toLocaleString('ru-RU') : '',
        'Дата обработки': p.processed_at ? new Date(p.processed_at).toLocaleString('ru-RU') : '-',
        'TX Hash': p.tx_hash || '-',
        'Причина отклонения': p.decline_reason || '-'
      }));

      if (dataToExport.length === 0) {
        toast.error('Нет данных для экспорта');
        return;
      }

      // Формирование CSV
      const headers = Object.keys(dataToExport[0]);
      const csvRows = [
        headers.join(','),
        ...dataToExport.map(row => 
          headers.map(header => {
            const value = String(row[header] || '').replace(/"/g, '""'); // Escape quotes
            return `"${value}"`;
          }).join(',')
        )
      ];
      
      const csvContent = '\uFEFF' + csvRows.join('\r\n'); // BOM для корректного отображения в Excel

      // Создание и скачивание файла
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().split('T')[0];
      const statusSuffix = statusFilter !== 'all' ? `_${statusFilter}` : '';
      
      link.setAttribute('href', url);
      link.setAttribute('download', `payouts${statusSuffix}_${timestamp}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Экспортировано ${dataToExport.length} заявок`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ошибка при экспорте');
    }
  };

  const handleSelectPayout = (payoutId: string) => {
    setSelectedPayouts(prev => 
      prev.includes(payoutId) 
        ? prev.filter(id => id !== payoutId)
        : [...prev, payoutId]
    );
  };

  const handleSelectAll = () => {
    const pendingPayouts = filteredPayouts.filter((p: any) => p.status === 'pending');
    if (selectedPayouts.length === pendingPayouts.length) {
      setSelectedPayouts([]);
    } else {
      setSelectedPayouts(pendingPayouts.map((p: any) => p.id));
    }
  };

  const handleBulkApprove = () => {
    if (selectedPayouts.length === 0) {
      toast.error('Выберите заявки для одобрения');
      return;
    }
    
    // Одобряем каждую заявку
    selectedPayouts.forEach(payoutId => {
      approveMutation.mutate(payoutId);
    });
    
    setSelectedPayouts([]);
    setShowBulkActions(false);
    toast.success(`Одобрено ${selectedPayouts.length} заявок`);
  };

  const handleBulkDecline = () => {
    if (selectedPayouts.length === 0) {
      toast.error('Выберите заявки для отклонения');
      return;
    }
    
    if (!declineReason.trim()) {
      toast.error('Укажите причину отклонения');
      return;
    }
    
    // Отклоняем каждую заявку
    selectedPayouts.forEach(payoutId => {
      declineMutation.mutate({ id: payoutId, reason: declineReason });
    });
    
    setSelectedPayouts([]);
    setShowBulkActions(false);
    setDeclineReason('');
    toast.success(`Отклонено ${selectedPayouts.length} заявок`);
  };

  const payouts = Array.isArray(data) ? data : (data?.data || []);

  // Calculate statistics
  const stats = {
    total: payouts.length,
    pending: payouts.filter((p: any) => p.status === 'pending').length,
    approved: payouts.filter((p: any) => p.status === 'approved').length,
    declined: payouts.filter((p: any) => p.status === 'declined').length,
    totalAmount: payouts.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0),
    pendingAmount: payouts.filter((p: any) => p.status === 'pending').reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0),
    approvedAmount: payouts.filter((p: any) => p.status === 'approved').reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0),
  };

  // Filter payouts based on search and filters
  const filteredPayouts = payouts.filter((payout: any) => {
    const matchesSearch = !searchQuery || 
      payout.user?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payout.user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payout.user?.tg_id?.toString().includes(searchQuery) ||
      payout.wallet_address?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payout.status === statusFilter;
    
    const matchesDate = dateFilter === 'all' || (() => {
      const payoutDate = new Date(payout.created_at);
      const now = new Date();
      switch (dateFilter) {
        case 'today': return payoutDate.toDateString() === now.toDateString();
        case 'week': return (now.getTime() - payoutDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
        case 'month': return payoutDate.getMonth() === now.getMonth() && payoutDate.getFullYear() === now.getFullYear();
        default: return true;
      }
    })();
    
    const matchesAmount = amountFilter === 'all' || (() => {
      const amount = parseFloat(payout.amount);
      switch (amountFilter) {
        case 'small': return amount < 100;
        case 'medium': return amount >= 100 && amount < 1000;
        case 'large': return amount >= 1000;
        default: return true;
      }
    })();
    
    return matchesSearch && matchesStatus && matchesDate && matchesAmount;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'declined': return 'error';
      default: return 'info';
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '⏳ В ожидании';
      case 'approved': return '✓ Одобрено';
      case 'declined': return '✕ Отклонено';
      default: return status;
    }
  }

  return (
    <div className="fade-in payouts-page">
      {/* Page Header */}
      <header className="payouts-page__header">
        <div className="payouts-page__title-section">
          <h1 className="payouts-page__title">Заявки на вывод</h1>
          <p className="payouts-page__subtitle">Управление запросами на выплаты от пользователей</p>
        </div>
        <div className="payouts-page__actions">
          <button
            onClick={handleExportPayouts}
            className="btn btn--secondary btn--sm"
            title="Экспортировать заявки"
          >
            <Download size={18} />
            Экспорт
          </button>
        </div>
      </header>

      {/* Statistics Cards */}
      <section className="payouts-page__stats">
        <div className="payouts-stats-grid">
          <div className="payout-stat-card payout-stat-card--primary">
            <div className="payout-stat-card__icon">
              <FileText size={24} />
            </div>
            <div className="payout-stat-card__content">
              <div className="payout-stat-card__value">{stats.total}</div>
              <div className="payout-stat-card__label">Всего заявок</div>
            </div>
          </div>

          <div className="payout-stat-card payout-stat-card--warning">
            <div className="payout-stat-card__icon">
              <Clock size={24} />
            </div>
            <div className="payout-stat-card__content">
              <div className="payout-stat-card__value">{stats.pending}</div>
              <div className="payout-stat-card__label">В ожидании</div>
            </div>
          </div>

          <div className="payout-stat-card payout-stat-card--success">
            <div className="payout-stat-card__icon">
              <CheckCircle size={24} />
            </div>
            <div className="payout-stat-card__content">
              <div className="payout-stat-card__value">{stats.approved}</div>
              <div className="payout-stat-card__label">Одобрено</div>
            </div>
          </div>

          <div className="payout-stat-card payout-stat-card--error">
            <div className="payout-stat-card__icon">
              <XCircle size={24} />
            </div>
            <div className="payout-stat-card__content">
              <div className="payout-stat-card__value">{stats.declined}</div>
              <div className="payout-stat-card__label">Отклонено</div>
            </div>
          </div>

          <div className="payout-stat-card payout-stat-card--info">
            <div className="payout-stat-card__icon">
              <DollarSign size={24} />
            </div>
            <div className="payout-stat-card__content">
              <div className="payout-stat-card__value">
                ${stats.totalAmount.toFixed(2)}
              </div>
              <div className="payout-stat-card__label">Общая сумма</div>
            </div>
          </div>

          <div className="payout-stat-card payout-stat-card--warning">
            <div className="payout-stat-card__icon">
              <AlertCircle size={24} />
            </div>
            <div className="payout-stat-card__content">
              <div className="payout-stat-card__value">
                ${stats.pendingAmount.toFixed(2)}
              </div>
              <div className="payout-stat-card__label">В ожидании</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="payouts-page__filters">
        <div className="payouts-filters__header">
          <div className="payouts-filters__title">
            <Filter size={20} className="payouts-filters__icon" />
            <h3 className="payouts-filters__heading">Фильтры и поиск</h3>
          </div>
        </div>
        
        <div className="payouts-filters__grid">
          {/* Search */}
          <div className="payouts-search">
            <div className="search-input">
              <Search size={18} className="search-input__icon" />
              <input
                type="text"
                className="search-input__field"
                placeholder="Поиск по пользователю, ID, кошельку..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="filter-group">
            <label className="filter-group__label">Статус</label>
            <select 
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Все статусы</option>
              <option value="pending">В ожидании</option>
              <option value="approved">Одобренные</option>
              <option value="declined">Отклоненные</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="filter-group">
            <label className="filter-group__label">Период</label>
            <select 
              className="filter-select"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">Все время</option>
              <option value="today">Сегодня</option>
              <option value="week">За неделю</option>
              <option value="month">За месяц</option>
            </select>
          </div>

          {/* Amount Filter */}
          <div className="filter-group">
            <label className="filter-group__label">Сумма</label>
            <select 
              className="filter-select"
              value={amountFilter}
              onChange={(e) => setAmountFilter(e.target.value)}
            >
              <option value="all">Любая сумма</option>
              <option value="small">Менее $100</option>
              <option value="medium">$100 - $1000</option>
              <option value="large">Более $1000</option>
            </select>
          </div>
        </div>
      </section>

      {/* Bulk Actions Panel */}
      {selectedPayouts.length > 0 && (
        <section className="payouts-page__bulk-actions">
          <div className="bulk-actions">
            <div className="bulk-actions__info">
              <span className="bulk-actions__count">
                Выбрано заявок: {selectedPayouts.length}
              </span>
              <button
                onClick={() => setSelectedPayouts([])}
                className="btn btn--secondary btn--sm"
                title="Очистить выбор"
              >
                Очистить выбор
              </button>
            </div>
            
            <div className="bulk-actions__controls">
              <button
                onClick={handleBulkApprove}
                className="btn btn--success btn--sm"
                title="Одобрить все выбранные заявки"
              >
                <Check size={16} />
                Одобрить все
              </button>
              <button
                onClick={() => setShowBulkActions(true)}
                className="btn btn--danger btn--sm"
                title="Отклонить все выбранные заявки"
              >
                <X size={16} />
                Отклонить все
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Payouts Table */}
      <section className="payouts-page__table">
        {isLoading ? (
          <div className="payouts-loading">
            <div className="loading-skeleton"></div>
            <p className="payouts-loading__text">Загрузка заявок...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="payouts-table">
              <thead className="payouts-table__head">
                <tr>
                  <th className="payouts-table__cell payouts-table__cell--checkbox">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={selectedPayouts.length > 0 && selectedPayouts.length === filteredPayouts.filter((p: any) => p.status === 'pending').length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="payouts-table__cell payouts-table__cell--user">Пользователь</th>
                  <th className="payouts-table__cell payouts-table__cell--amount">Сумма</th>
                  <th className="payouts-table__cell payouts-table__cell--method">Метод</th>
                  <th className="payouts-table__cell payouts-table__cell--wallet">Реквизиты</th>
                  <th className="payouts-table__cell payouts-table__cell--status">Статус</th>
                  <th className="payouts-table__cell payouts-table__cell--date">Дата</th>
                  <th className="payouts-table__cell payouts-table__cell--actions">Действия</th>
                </tr>
              </thead>
              <tbody className="payouts-table__body">
                {filteredPayouts.length === 0 ? (
                  <tr className="payouts-table__row">
                    <td colSpan={8} className="payouts-table__cell payouts-table__cell--empty">
                      {payouts.length === 0 ? 'Заявки не найдены' : 'Нет заявок, соответствующих фильтрам'}
                    </td>
                  </tr>
                ) : (
                  filteredPayouts.map((payout: any) => (
                    <tr 
                      key={payout.id} 
                      className={`payouts-table__row ${selectedPayouts.includes(payout.id) ? 'payouts-table__row--selected' : ''}`}
                    >
                      <td className="payouts-table__cell payouts-table__cell--checkbox">
                        {payout.status === 'pending' && (
                          <input
                            type="checkbox"
                            className="checkbox"
                            checked={selectedPayouts.includes(payout.id)}
                            onChange={() => handleSelectPayout(payout.id)}
                          />
                        )}
                      </td>
                      <td className="payouts-table__cell payouts-table__cell--user">
                        <div className="payout-user-info">
                          <div className="payout-user-info__name">
                            {payout.user?.first_name || payout.user?.username || 'Аноним'}
                          </div>
                          <div className="payout-user-info__id">
                            ID: {payout.user?.tg_id}
                          </div>
                        </div>
                      </td>
                      <td className="payouts-table__cell payouts-table__cell--amount">
                        <span className="payout-amount">
                          ${parseFloat(payout.amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="payouts-table__cell payouts-table__cell--method">
                        <span className="payout-method">{payout.method}</span>
                      </td>
                      <td className="payouts-table__cell payouts-table__cell--wallet">
                        <span className="payout-wallet" title={payout.wallet_address}>
                          {payout.wallet_address}
                        </span>
                      </td>
                      <td className="payouts-table__cell payouts-table__cell--status">
                        <span className={`badge badge--${getStatusBadge(payout.status)}`}>
                          {getStatusText(payout.status)}
                        </span>
                      </td>
                      <td className="payouts-table__cell payouts-table__cell--date">
                        <span className="payout-date">
                          {new Date(payout.created_at).toLocaleString('ru-RU')}
                        </span>
                      </td>
                      <td className="payouts-table__cell payouts-table__cell--actions">
                        <div className="payout-actions">
                          <button
                            onClick={() => handleViewDetails(payout)}
                            className="btn btn--secondary btn--sm btn--icon"
                            title="Просмотреть детали заявки"
                          >
                            <Eye size={16} />
                            Детали
                          </button>
                          
                          {payout.status === 'pending' && (
                            <>
                              <button
                                onClick={() => approveMutation.mutate(payout.id)}
                                className="btn btn--success btn--sm btn--icon"
                                title="Одобрить заявку"
                              >
                                <Check size={16} />
                                Одобрить
                              </button>
                              <button
                                onClick={() => handleDeclineClick(payout.id)}
                                className="btn btn--danger btn--sm btn--icon"
                                title="Отклонить заявку"
                              >
                                <X size={16} />
                                Отклонить
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={() => setShowDeclineModal(false)}
        >
          <div 
            style={{
              background: '#1a1a1a',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '100%',
              border: '1px solid rgba(248, 113, 113, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '24px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Причина отклонения</h2>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Укажите причину..."
                rows={4}
              />
            </div>
            <div style={{
              padding: '24px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={handleConfirmDecline}
                className="danger"
                style={{ flex: 1 }}
                disabled={declineMutation.isPending}
              >
                {declineMutation.isPending ? 'Отклонение...' : 'Отклонить заявку'}
              </button>
              <button
                onClick={() => setShowDeclineModal(false)}
                className="secondary"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payout Details Modal */}
      {showPayoutDetails && selectedPayout && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={() => setShowPayoutDetails(false)}
        >
          <div 
            style={{
              background: '#1a1a1a',
              borderRadius: '20px',
              maxWidth: '600px',
              width: '100%',
              border: '1px solid rgba(255,255,255,0.1)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '32px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Детали заявки</h2>
              <button
                onClick={() => setShowPayoutDetails(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#888',
                  fontSize: '1.5rem',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: '32px' }}>
              <div style={{ display: 'grid', gap: '24px' }}>
                {/* User Info */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', color: '#fff' }}>
                    👤 Информация о пользователе
                  </h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Имя:</span>
                      <span style={{ color: '#fff' }}>{selectedPayout.user?.first_name || 'Не указано'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Username:</span>
                      <span style={{ color: '#fff' }}>@{selectedPayout.user?.username || 'Не указано'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Telegram ID:</span>
                      <span style={{ color: '#fff', fontFamily: 'monospace' }}>{selectedPayout.user?.tg_id}</span>
                    </div>
                  </div>
                </div>

                {/* Payout Info */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', color: '#fff' }}>
                    💰 Информация о выплате
                  </h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Сумма:</span>
                      <span style={{ color: '#facc15', fontWeight: 700, fontSize: '1.2rem' }}>
                        ${parseFloat(selectedPayout.amount).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Метод:</span>
                      <span style={{ color: '#fff' }}>{selectedPayout.method}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Реквизиты:</span>
                      <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                        {selectedPayout.wallet_address || selectedPayout.method_details}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Статус:</span>
                      <span className={`badge ${getStatusBadge(selectedPayout.status)}`}>
                        {getStatusText(selectedPayout.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', color: '#fff' }}>
                    ⏰ Временные метки
                  </h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Создана:</span>
                      <span style={{ color: '#fff' }}>
                        {new Date(selectedPayout.created_at).toLocaleString('ru-RU')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Обновлена:</span>
                      <span style={{ color: '#fff' }}>
                        {new Date(selectedPayout.updated_at).toLocaleString('ru-RU')}
                      </span>
                    </div>
                    {selectedPayout.processed_by_admin_tg_id && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#888' }}>Обработана админом:</span>
                        <span style={{ color: '#fff', fontFamily: 'monospace' }}>
                          {selectedPayout.processed_by_admin_tg_id}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Decline Reason */}
                {selectedPayout.reason_if_declined && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', color: '#ef4444' }}>
                      ❌ Причина отклонения
                    </h3>
                    <p style={{ color: '#fff', lineHeight: 1.6 }}>
                      {selectedPayout.reason_if_declined}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Decline Modal */}
      {showBulkActions && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={() => setShowBulkActions(false)}
        >
          <div 
            style={{
              background: '#1a1a1a',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '100%',
              border: '1px solid rgba(248, 113, 113, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '24px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Массовое отклонение</h2>
              <p style={{ color: '#888', marginTop: '8px' }}>
                Отклонить {selectedPayouts.length} заявок
              </p>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Укажите причину отклонения для всех выбранных заявок..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  resize: 'vertical'
                }}
              />
            </div>
            <div style={{
              padding: '24px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={handleBulkDecline}
                className="danger"
                style={{ flex: 1 }}
                disabled={declineMutation.isPending}
              >
                {declineMutation.isPending ? 'Отклонение...' : `Отклонить ${selectedPayouts.length} заявок`}
              </button>
              <button
                onClick={() => setShowBulkActions(false)}
                className="secondary"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

