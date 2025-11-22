import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { statsApi, tasksApi } from '../api/client';
import { 
  Users, DollarSign, TrendingUp, Clock, Activity, Zap, Sparkles, 
  Award, CheckCircle, XCircle, BarChart3, ArrowUp, ArrowDown 
} from 'lucide-react';
import { useSyncRefetch } from '../hooks/useSync';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

export default function Dashboard() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['stats'],
    queryFn: () => statsApi.getStats(),
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['stats-history'],
    queryFn: () => statsApi.getHistory(30),
  });

  const { data: topUsers, isLoading: topUsersLoading } = useQuery({
    queryKey: ['top-users'],
    queryFn: () => statsApi.getTopUsers(5),
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks-stats'],
    queryFn: () => tasksApi.getTasks({ limit: 1000 }),
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

  // Prepare chart data
  const chartData = history?.real?.map((snapshot: any) => ({
    date: new Date(snapshot.taken_at).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
    users: parseFloat(snapshot.users_count || 0),
    balance: parseFloat(snapshot.total_balance || 0),
    earned: parseFloat(snapshot.total_earned || 0),
    active: parseFloat(snapshot.active_users_24h || 0),
  })) || [];

  // Tasks statistics
  const tasks = tasksData?.data || [];
  const activeTasks = tasks.filter((t: any) => t.active).length;
  const completedTasks = tasks.reduce((sum: number, t: any) => sum + (t.completions_count || 0), 0);
  const pendingModeration = tasks.reduce((sum: number, t: any) => sum + (t.pending_moderation || 0), 0);

  // Calculate growth percentages
  const calculateGrowth = (current: number, previous: number): string => {
    if (!previous || previous === 0) return '0';
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const usersGrowth = chartData.length > 1 
    ? calculateGrowth(chartData[chartData.length - 1]?.users || 0, chartData[chartData.length - 2]?.users || 0)
    : '0';
  const balanceGrowth = chartData.length > 1
    ? calculateGrowth(chartData[chartData.length - 1]?.balance || 0, chartData[chartData.length - 2]?.balance || 0)
    : '0';
  const earnedGrowth = chartData.length > 1
    ? calculateGrowth(chartData[chartData.length - 1]?.earned || 0, chartData[chartData.length - 2]?.earned || 0)
    : '0';

  const cards = [
    {
      title: 'Всего пользователей',
      value: realStats?.users_count || 0,
      icon: Users,
      variant: 'info',
      growth: usersGrowth,
      trend: parseFloat(usersGrowth || '0') >= 0 ? 'up' : 'down',
    },
    {
      title: 'Общий баланс',
      value: `$${(realStats?.total_balance || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      variant: 'success',
      growth: balanceGrowth,
      trend: parseFloat(balanceGrowth || '0') >= 0 ? 'up' : 'down',
    },
    {
      title: 'Заработано',
      value: `$${(realStats?.total_earned || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      variant: 'warning',
      growth: earnedGrowth,
      trend: parseFloat(earnedGrowth || '0') >= 0 ? 'up' : 'down',
    },
    {
      title: 'Активных за 24ч',
      value: realStats?.active_users_24h || 0,
      icon: Activity,
      variant: 'error',
    },
    {
      title: 'Активных заданий',
      value: activeTasks,
      icon: Award,
      variant: 'primary',
    },
    {
      title: 'Выполнено заданий',
      value: completedTasks,
      icon: CheckCircle,
      variant: 'success',
    },
    {
      title: 'На модерации',
      value: pendingModeration,
      icon: Clock,
      variant: 'warning',
    },
    {
      title: 'Выплачено',
      value: `$${(realStats?.total_payouts || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Sparkles,
      variant: 'info',
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
      value: `$${(fakeStats?.paid_usdt || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Sparkles,
      variant: 'success',
    },
  ];

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe'];

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
      <section className="stats-grid" style={{ marginBottom: '24px' }}>
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
                {card.growth !== undefined && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    marginTop: '4px',
                    fontSize: 'var(--font-size-xs)',
                    color: card.trend === 'up' ? 'var(--success)' : 'var(--error)'
                  }}>
                    {card.trend === 'up' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    <span>{Math.abs(parseFloat(card.growth || '0'))}%</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Charts Section */}
      <section style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))', 
        gap: '24px', 
        marginBottom: '24px' 
      }}>
        {/* Users Growth Chart */}
        <div className="card">
          <div className="card-header">
            <Users size={20} style={{ color: 'var(--primary)' }} />
            <h2 className="card-title">Рост пользователей</h2>
          </div>
          <div style={{ padding: '16px', height: 'clamp(250px, 40vh, 300px)' }}>
            {historyLoading ? (
              <div className="loading-skeleton" style={{ height: '100%' }}></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--text-secondary)"
                    style={{ fontSize: 'clamp(10px, 2vw, 12px)' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="var(--text-secondary)"
                    style={{ fontSize: 'clamp(10px, 2vw, 12px)' }}
                    width={50}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card-bg)', 
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: 'clamp(11px, 2vw, 13px)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="users" 
                    stroke="#667eea" 
                    fillOpacity={1} 
                    fill="url(#colorUsers)"
                    name="Пользователи"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Balance & Earned Chart */}
        <div className="card">
          <div className="card-header">
            <DollarSign size={20} style={{ color: 'var(--success)' }} />
            <h2 className="card-title">Баланс и заработок</h2>
          </div>
          <div style={{ padding: '16px', height: 'clamp(250px, 40vh, 300px)' }}>
            {historyLoading ? (
              <div className="loading-skeleton" style={{ height: '100%' }}></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--text-secondary)"
                    style={{ fontSize: 'clamp(10px, 2vw, 12px)' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="var(--text-secondary)"
                    style={{ fontSize: 'clamp(10px, 2vw, 12px)' }}
                    width={50}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card-bg)', 
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: 'clamp(11px, 2vw, 13px)'
                    }}
                    formatter={(value: number) => `$${value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}`}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: 'clamp(11px, 2vw, 13px)' }}
                    iconSize={12}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Баланс"
                    dot={{ r: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="earned" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    name="Заработано"
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Active Users Chart */}
        <div className="card">
          <div className="card-header">
            <Activity size={20} style={{ color: 'var(--error)' }} />
            <h2 className="card-title">Активные пользователи (24ч)</h2>
          </div>
          <div style={{ padding: '16px', height: 'clamp(250px, 40vh, 300px)' }}>
            {historyLoading ? (
              <div className="loading-skeleton" style={{ height: '100%' }}></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--text-secondary)"
                    style={{ fontSize: 'clamp(10px, 2vw, 12px)' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="var(--text-secondary)"
                    style={{ fontSize: 'clamp(10px, 2vw, 12px)' }}
                    width={50}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card-bg)', 
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: 'clamp(11px, 2vw, 13px)'
                    }}
                  />
                  <Bar dataKey="active" fill="#ef4444" name="Активные" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tasks Distribution */}
        <div className="card">
          <div className="card-header">
            <Award size={20} style={{ color: 'var(--primary)' }} />
            <h2 className="card-title">Статистика заданий</h2>
          </div>
          <div style={{ padding: '16px', height: 'clamp(250px, 40vh, 300px)' }}>
            {tasksLoading ? (
              <div className="loading-skeleton" style={{ height: '100%' }}></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Активные', value: activeTasks, color: '#10b981' },
                      { name: 'Неактивные', value: tasks.length - activeTasks, color: '#ef4444' },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={isMobile ? 60 : 80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'Активные', value: activeTasks, color: '#10b981' },
                      { name: 'Неактивные', value: tasks.length - activeTasks, color: '#ef4444' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      fontSize: 'clamp(11px, 2vw, 13px)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Top Users & Fake Stats */}
      <section style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', 
        gap: '24px', 
        marginBottom: '24px' 
      }}>
        {/* Top Users */}
        <div className="card">
          <div className="card-header">
            <BarChart3 size={20} style={{ color: 'var(--primary)' }} />
            <h2 className="card-title">Топ пользователей</h2>
          </div>
          <div style={{ padding: '16px' }}>
            {topUsersLoading ? (
              <div className="loading-skeleton" style={{ height: '200px' }}></div>
            ) : (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                    По балансу
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {topUsers?.top_by_balance?.slice(0, 5).map((user: any, index: number) => (
                      <div key={user.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            background: COLORS[index % COLORS.length],
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {index + 1}
                          </span>
                          <span style={{ fontSize: 'var(--font-size-sm)' }}>
                            {user.first_name || user.username || `ID: ${user.tg_id}`}
                          </span>
                        </div>
                        <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--success)' }}>
                          ${parseFloat(user.balance_usdt || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                    По заработку
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {topUsers?.top_by_earned?.slice(0, 5).map((user: any, index: number) => (
                      <div key={user.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            background: COLORS[index % COLORS.length],
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {index + 1}
                          </span>
                          <span style={{ fontSize: 'var(--font-size-sm)' }}>
                            {user.first_name || user.username || `ID: ${user.tg_id}`}
                          </span>
                        </div>
                        <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--warning)' }}>
                          ${parseFloat(user.total_earned || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fake Stats Section */}
        <div className="card">
          <div className="card-header">
            <Sparkles size={20} style={{ color: 'var(--accent)' }} />
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
        </div>
      </section>
    </div>
  );
}
