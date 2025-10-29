import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../api/client';
import { Users, DollarSign, TrendingUp, Clock, Activity, Zap, Sparkles } from 'lucide-react';
import { useSyncRefetch } from '../hooks/useSync';

export default function Dashboard() {
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['stats'],
    queryFn: () => statsApi.getStats(),
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  // 🔄 Auto-refresh dashboard on any user activity
  useSyncRefetch(['users.created', 'users.updated', 'users.balance_updated', 'payouts.approved', 'payouts.declined'], refetch);

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-section">
            <h1 className="page-title">Дашборд</h1>
            <p className="page-subtitle">Обзор основных метрик системы</p>
          </div>
        </div>
        
        <div className="loading">
          <div className="loading-skeleton" style={{ height: '120px', marginBottom: '16px' }}></div>
          <div className="loading-skeleton" style={{ height: '120px', marginBottom: '16px' }}></div>
          <div className="loading-skeleton" style={{ height: '120px', marginBottom: '16px' }}></div>
          <div className="loading-skeleton" style={{ height: '120px' }}></div>
        </div>
      </div>
    );
  }

  const realStats = stats?.real;
  const fakeStats = stats?.fake;

  const cards = [
    {
      title: 'Всего пользователей',
      value: realStats?.users_count || 0,
      icon: Users,
      variant: 'info',
    },
    {
      title: 'Общий баланс',
      value: `$${(realStats?.total_balance || 0).toLocaleString()}`,
      icon: DollarSign,
      variant: 'success',
    },
    {
      title: 'Заработано',
      value: `$${(realStats?.total_earned || 0).toLocaleString()}`,
      icon: TrendingUp,
      variant: 'warning',
    },
    {
      title: 'Активных за 24ч',
      value: realStats?.active_users_24h || 0,
      icon: Activity,
      variant: 'error',
    },
  ];

  const fakeStatsCards = [
    {
      label: 'Онлайн',
      value: fakeStats?.online || 0,
      icon: Activity,
      variant: 'info',
    },
    {
      label: 'Активных',
      value: fakeStats?.active || 0,
      icon: Zap,
      variant: 'primary',
    },
    {
      label: 'Выплачено USDT',
      value: `$${(fakeStats?.paid_usdt || 0).toLocaleString()}`,
      icon: Sparkles,
      variant: 'success',
    },
  ];

  return (
    <div className="page">
      {/* Page Header */}
      <header className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Дашборд</h1>
          <p className="page-subtitle">Обзор основных метрик системы</p>
        </div>
      </header>

      {/* Main Stats Cards */}
      <section className="stats-grid">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`stat-card stat-card--${card.variant}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="stat-card__icon">
                <Icon size={24} />
              </div>
              <div className="stat-card__content">
                <div className="stat-card__value">{card.value}</div>
                <div className="stat-card__label">{card.title}</div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Fake Stats Section */}
      <section className="card">
        <div className="card-header">
          <Sparkles size={24} style={{ color: 'var(--accent)' }} />
          <h2 className="card-title">Фейк-статистика</h2>
        </div>

        <div className="stats-grid" style={{ marginBottom: '0' }}>
          {fakeStatsCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`stat-card stat-card--${stat.variant}`}
              >
                <div className="stat-card__icon">
                  <Icon size={24} />
                </div>
                <div className="stat-card__content">
                  <div className="stat-card__value">{stat.value}</div>
                  <div className="stat-card__label">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--spacing-sm)',
          paddingTop: 'var(--spacing-lg)',
          borderTop: '1px solid var(--border)',
          marginTop: 'var(--spacing-xl)'
        }}>
          <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
          <p style={{ 
            color: 'var(--text-tertiary)', 
            fontSize: 'var(--font-size-xs)',
            margin: 0
          }}>
            Последнее обновление:{' '}
            <span style={{ 
              color: 'var(--text-secondary)', 
              fontWeight: 'var(--font-weight-medium)' 
            }}>
              {fakeStats?.calculated_at
                ? new Date(fakeStats.calculated_at).toLocaleString('ru-RU')
                : '-'}
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}