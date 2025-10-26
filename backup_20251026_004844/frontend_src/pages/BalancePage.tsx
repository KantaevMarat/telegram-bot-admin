import { useQuery } from '@tanstack/react-query';
import { balanceApi } from '../api/client';
import { DollarSign, TrendingUp, Users, ArrowUp, ArrowDown, Wallet, CreditCard, BarChart3 } from 'lucide-react';

export default function BalancePage() {
  const { data: overview, isLoading: isLoadingOverview } = useQuery({
    queryKey: ['balance-overview'],
    queryFn: () => balanceApi.getOverview(),
  });

  const { data: logs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['balance-logs'],
    queryFn: () => balanceApi.getLogs(),
  });

  return (
    <div className="fade-in balance-page">
      {/* Page Header */}
      <header className="balance-page__header">
        <div className="balance-page__title-section">
          <h1 className="balance-page__title">Балансы</h1>
          <p className="balance-page__subtitle">Обзор финансовых потоков и логирование</p>
        </div>
      </header>

      {/* Overview Cards */}
      <section className="balance-page__stats">
        <div className="balance-stats-grid">
          <div className="balance-stat-card balance-stat-card--primary">
            <div className="balance-stat-card__icon">
              <Wallet size={24} />
            </div>
            <div className="balance-stat-card__content">
              <div 
                className="balance-stat-card__value"
                data-large={(overview?.total_balance || 0) > 999999 ? "true" : "false"}
              >
                ${(overview?.total_balance || 0) > 999999999 
                  ? (overview?.total_balance || 0).toExponential(2)
                  : (overview?.total_balance || 0).toLocaleString()
                }
              </div>
              <div className="balance-stat-card__label">Общий баланс</div>
            </div>
          </div>

          <div className="balance-stat-card balance-stat-card--success">
            <div className="balance-stat-card__icon">
              <TrendingUp size={24} />
            </div>
            <div className="balance-stat-card__content">
              <div 
                className="balance-stat-card__value"
                data-large={(overview?.total_earned || 0) > 999999 ? "true" : "false"}
              >
                ${(overview?.total_earned || 0) > 999999999 
                  ? (overview?.total_earned || 0).toExponential(2)
                  : (overview?.total_earned || 0).toLocaleString()
                }
              </div>
              <div className="balance-stat-card__label">Всего заработано</div>
            </div>
          </div>

          <div className="balance-stat-card balance-stat-card--info">
            <div className="balance-stat-card__icon">
              <BarChart3 size={24} />
            </div>
            <div className="balance-stat-card__content">
              <div className="balance-stat-card__value">
                {overview?.total_users || 0}
              </div>
              <div className="balance-stat-card__label">Активных пользователей</div>
            </div>
          </div>

          <div className="balance-stat-card balance-stat-card--warning">
            <div className="balance-stat-card__icon">
              <CreditCard size={24} />
            </div>
            <div className="balance-stat-card__content">
              <div 
                className="balance-stat-card__value"
                data-large={(overview?.total_payouts || 0) > 999999 ? "true" : "false"}
              >
                ${(overview?.total_payouts || 0) > 999999999 
                  ? (overview?.total_payouts || 0).toExponential(2)
                  : (overview?.total_payouts || 0).toLocaleString()
                }
              </div>
              <div className="balance-stat-card__label">Выплачено</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="balance-page__content">
        <div className="balance-content-grid">
          {/* Top Users */}
          <div className="balance-section">
            <div className="balance-section__header">
              <div className="balance-section__title">
                <Users size={24} className="balance-section__icon" />
                <h2 className="balance-section__heading">Топ пользователей по балансу</h2>
              </div>
            </div>
            <div className="balance-section__body">
              {isLoadingOverview ? (
                <div className="balance-loading">
                  <div className="loading-skeleton"></div>
                  <div className="loading-skeleton"></div>
                  <div className="loading-skeleton"></div>
                </div>
              ) : (
                <div className="top-users-list">
                  {overview?.top_users?.map((user: any, index: number) => (
                    <div key={user.id} className="top-user-item">
                      <div className="top-user-item__rank">
                        <span className="rank-number">{index + 1}</span>
                      </div>
                      <div className="top-user-item__info">
                        <div className="top-user-item__name">
                          {user.first_name || user.username || 'Аноним'}
                        </div>
                        <div className="top-user-item__username">
                          @{user.username || 'без username'}
                        </div>
                      </div>
                      <div className="top-user-item__balance">
                        <span 
                          className="balance-amount"
                          data-large={parseFloat(user.balance_usdt || 0) > 999999 ? "true" : "false"}
                        >
                          ${parseFloat(user.balance_usdt || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Balance Logs */}
          <div className="balance-section">
            <div className="balance-section__header">
              <div className="balance-section__title">
                <BarChart3 size={24} className="balance-section__icon" />
                <h2 className="balance-section__heading">Последние транзакции</h2>
              </div>
            </div>
            <div className="balance-section__body">
              {isLoadingLogs ? (
                <div className="balance-loading">
                  <div className="loading-skeleton"></div>
                  <div className="loading-skeleton"></div>
                  <div className="loading-skeleton"></div>
                </div>
              ) : (
                <div className="transactions-list">
                  {(logs?.data && Array.isArray(logs.data)) ? logs.data.map((log: any) => (
                    <div key={log.id} className="transaction-item">
                      <div className={`transaction-item__icon ${log.delta > 0 ? 'transaction-item__icon--positive' : 'transaction-item__icon--negative'}`}>
                        {log.delta > 0 ? (
                          <ArrowUp size={20} />
                        ) : (
                          <ArrowDown size={20} />
                        )}
                      </div>
                      <div className="transaction-item__content">
                        <div className="transaction-item__user">
                          {log.user?.first_name || log.user?.username || 'Система'}
                        </div>
                        <div className="transaction-item__reason">
                          {log.reason}
                        </div>
                      </div>
                      <div className="transaction-item__amount">
                        <div 
                          className={`amount-value ${log.delta > 0 ? 'amount-value--positive' : 'amount-value--negative'}`}
                          data-large={Math.abs(parseFloat(log.delta || 0)) > 999999 ? "true" : "false"}
                        >
                          {log.delta > 0 ? '+' : ''}${parseFloat(log.delta || 0).toFixed(2)}
                        </div>
                        <div className="amount-date">
                          {new Date(log.created_at).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="balance-empty">
                      <p>Нет транзакций для отображения</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


