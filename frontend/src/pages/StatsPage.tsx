import { useQuery, useQueryClient } from '@tanstack/react-query';
import { statsApi } from '../api/client';
import toast from 'react-hot-toast';
import { BarChart3, RefreshCw, Users, DollarSign, TrendingUp, Activity, Zap, Sparkles } from 'lucide-react';

export default function StatsPage() {
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => statsApi.getStats(),
    refetchInterval: 30000, // Обновлять каждые 30 секунд
    staleTime: 0, // Данные устаревают сразу
  });

  const handleRegenerate = async () => {
    const toastId = toast.loading('Пересчитываем статистику...');
    try {
      await statsApi.regenerateFakeStats();
      // Инвалидируем кэш и заново загружаем данные
      await queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Фейк-статистика обновлена!', { id: toastId });
    } catch (error) {
      toast.error('Ошибка обновления', { id: toastId });
    }
  };
  
  const realStats = stats?.real;
  const fakeStats = stats?.fake;

  const StatItem = ({ icon: Icon, label, value, variant }: { icon: React.ElementType, label: string, value: any, variant: string }) => (
    <div className={`stat-card stat-card--${variant}`} style={{ margin: 0 }}>
      <div className="stat-card__icon">
        <Icon size={20} />
      </div>
      <div className="stat-card__content">
        <div className="stat-card__value">{value || 0}</div>
        <div className="stat-card__label">{label}</div>
      </div>
    </div>
  );

  return (
    <div className="page">
      {/* Page Header */}
      <header className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Статистика</h1>
          <p className="page-subtitle">Детальный обзор реальных и фейковых метрик</p>
        </div>
        <div className="page-actions">
          <button
            onClick={handleRegenerate}
            className="btn btn--secondary btn--sm"
          >
            <RefreshCw size={16} />
            Пересчитать фейк-стат
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="loading">
          <div className="loading-skeleton" style={{ width: '200px', height: '40px', marginBottom: '16px' }}></div>
          <div className="loading-skeleton" style={{ width: '300px', height: '20px' }}></div>
        </div>
      ) : (
        <div className="stats-columns">
          {/* Real Stats */}
          <div className="card">
            <div className="card-header">
              <BarChart3 size={28} style={{ color: 'var(--accent)' }} />
              <h2 className="card-title">Реальная статистика</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <StatItem icon={Users} label="Всего пользователей" value={realStats?.users_count} variant="primary" />
              <StatItem icon={DollarSign} label="Общий баланс" value={`$${(realStats?.total_balance || 0).toLocaleString()}`} variant="success" />
              <StatItem icon={TrendingUp} label="Заработано" value={`$${(realStats?.total_earned || 0).toLocaleString()}`} variant="warning" />
              <StatItem icon={Activity} label="Активных за 24ч" value={realStats?.active_users_24h} variant="error" />
            </div>
          </div>

          {/* Fake Stats */}
          <div className="card">
            <div className="card-header">
              <Sparkles size={28} style={{ color: 'var(--accent)' }} />
              <h2 className="card-title">Фейк-статистика</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <StatItem icon={Activity} label="Онлайн" value={fakeStats?.online} variant="info" />
              <StatItem icon={Zap} label="Активных" value={fakeStats?.active} variant="primary" />
              <StatItem icon={Sparkles} label="Выплачено USDT" value={`$${(fakeStats?.paid_usdt || 0).toLocaleString()}`} variant="success" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}