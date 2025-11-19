import { useQuery } from '@tanstack/react-query';
import { balanceApi, ranksApi } from '../api/client';
import { DollarSign, TrendingUp, Users, ArrowUp, ArrowDown, Wallet, CreditCard, BarChart3, Award, Circle } from 'lucide-react';
import { useSyncRefetch } from '../hooks/useSync';

export default function BalancePage() {
  const { data: overview, isLoading: isLoadingOverview, refetch: refetchOverview } = useQuery({
    queryKey: ['balance-overview'],
    queryFn: () => balanceApi.getOverview(),
  });

  const { data: logs, isLoading: isLoadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['balance-logs'],
    queryFn: () => balanceApi.getLogs(),
  });

  // 🔄 Auto-refresh on balance changes
  useSyncRefetch(['users.balance_updated', 'payouts.approved', 'payouts.declined'], () => {
    refetchOverview();
    refetchLogs();
  });

  // Get ranks for top users
  const topUsers = overview?.top_users || [];
  const { data: userRanksMap } = useQuery({
    queryKey: ['top-users-ranks', topUsers.map((u: any) => u.id).join(',')],
    queryFn: async () => {
      const ranks: Record<string, any> = {};
      await Promise.all(
        topUsers.map(async (user: any) => {
          try {
            const response = await ranksApi.getUserRank(user.id);
            const rankData = response.rank || response;
            ranks[user.id] = {
              current_rank: rankData.current_rank || 'stone',
              bonus_percentage: rankData.bonus_percentage || 0,
              ...rankData
            };
          } catch (error: any) {
            ranks[user.id] = { current_rank: 'stone', bonus_percentage: 0 };
          }
        })
      );
      return ranks;
    },
    enabled: topUsers.length > 0,
    staleTime: 30000,
  });

  // Function to get rank badge
  const getRankIcon = (rank: string) => {
    const normalizedRank = (rank || '').toLowerCase();
    
    const rankInfo: Record<string, { icon: JSX.Element; color: string }> = {
      stone: { icon: <Circle size={14} />, color: '#6b7280' },
      bronze: { icon: <span>🥉</span>, color: '#cd7f32' },
      silver: { icon: <span>🥈</span>, color: '#c0c0c0' },
      gold: { icon: <span>🥇</span>, color: '#ffd700' },
      platinum: { icon: <span>💎</span>, color: '#e5e4e2' },
    };

    return rankInfo[normalizedRank] || rankInfo.stone;
  };

  return (
    <div className="page">
      {/* Page Header */}
      <header className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Балансы</h1>
          <p className="page-subtitle">Обзор финансовых потоков и логирование</p>
        </div>
      </header>

      {/* Overview Cards */}
      <section className="stats-grid">
        <div className="stat-card stat-card--primary">
          <div className="stat-card__icon">
            <Wallet size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">
              ${(overview?.total_balance || 0) > 999999999 
                ? (overview?.total_balance || 0).toExponential(2)
                : (overview?.total_balance || 0).toLocaleString()
              }
            </div>
            <div className="stat-card__label">Общий баланс</div>
          </div>
        </div>

        <div className="stat-card stat-card--success">
          <div className="stat-card__icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">
              ${(overview?.total_earned || 0) > 999999999 
                ? (overview?.total_earned || 0).toExponential(2)
                : (overview?.total_earned || 0).toLocaleString()
              }
            </div>
            <div className="stat-card__label">Всего заработано</div>
          </div>
        </div>

        <div className="stat-card stat-card--info">
          <div className="stat-card__icon">
            <BarChart3 size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">
              {overview?.total_users || 0}
            </div>
            <div className="stat-card__label">Активных пользователей</div>
          </div>
        </div>

        <div className="stat-card stat-card--warning">
          <div className="stat-card__icon">
            <CreditCard size={24} />
          </div>
          <div className="stat-card__content">
            <div className="stat-card__value">
              ${(overview?.total_payouts || 0) > 999999999 
                ? (overview?.total_payouts || 0).toExponential(2)
                : (overview?.total_payouts || 0).toLocaleString()
              }
            </div>
            <div className="stat-card__label">Выплачено</div>
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
                        {userRanksMap?.[user.id] && (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            marginTop: '4px',
                            fontSize: 'var(--font-size-xs)',
                            color: getRankIcon(userRanksMap[user.id].current_rank).color
                          }}>
                            <Award size={12} />
                            {getRankIcon(userRanksMap[user.id].current_rank).icon}
                            <span style={{ marginLeft: '2px' }}>
                              {userRanksMap[user.id].current_rank === 'stone' && 'Камень'}
                              {userRanksMap[user.id].current_rank === 'bronze' && 'Бронза'}
                              {userRanksMap[user.id].current_rank === 'silver' && 'Серебро'}
                              {userRanksMap[user.id].current_rank === 'gold' && 'Золото'}
                              {userRanksMap[user.id].current_rank === 'platinum' && 'Платина'}
                            </span>
                          </div>
                        )}
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


