import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import {
  BarChart3,
  Users,
  DollarSign,
  FileText,
  Settings,
  Send,
  Square,
  GitBranch,
  CheckSquare,
  MessageSquare,
  Shield,
  LogOut,
  Home,
  RefreshCw,
  Radio,
  Bug,
  Terminal,
  Clock,
} from 'lucide-react';
import { DiagnosticsPanel } from './DiagnosticsPanel';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { admin, logout, refreshToken } = useAuthStore();
  const [refreshingToken, setRefreshingToken] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const handleRefreshToken = async () => {
    setRefreshingToken(true);
    try {
      await refreshToken();
      toast.success('🔄 Токен обновлен!');
    } catch (error) {
      toast.error('❌ Не удалось обновить токен');
      console.error('Token refresh error:', error);
    } finally {
      setRefreshingToken(false);
    }
  };

  const menuItems = [
    { path: '/', icon: Home, label: 'Главная', color: '#646cff' },
    { path: '/stats', icon: BarChart3, label: 'Статистика', color: '#60a5fa' },
    { path: '/users', icon: Users, label: 'Пользователи', color: '#a78bfa' },
    { path: '/balance', icon: DollarSign, label: 'Балансы', color: '#4ade80' },
    { path: '/payouts', icon: FileText, label: 'Заявки', color: '#facc15' },
    { path: '/settings', icon: Settings, label: 'Настройки', color: '#94a3b8' },
    { path: '/broadcast', icon: Send, label: 'Рассылка', color: '#f87171' },
    { path: '/buttons', icon: Square, label: 'Кнопки', color: '#fb923c' },
    { path: '/scenarios', icon: GitBranch, label: 'Сценарии', color: '#22d3ee' },
    { path: '/tasks', icon: CheckSquare, label: 'Задания', color: '#a855f7' },
    { path: '/commands', icon: Terminal, label: 'Команды', color: '#10b981' },
    { path: '/moderation', icon: Clock, label: 'Модерация', color: '#f59e0b' },
    { path: '/chats', icon: MessageSquare, label: 'Чаты', color: '#10b981' },
    { path: '/channels', icon: Radio, label: 'Каналы', color: '#14b8a6' },
    { path: '/admins', icon: Shield, label: 'Админы', color: '#ef4444' },
  ];

  return (
    <div className="main-layout">
      {/* Sidebar */}
      <nav className="sidebar">
        {/* Logo */}
        <div className="sidebar-header">
          <div className="sidebar-header__content">
            <div className="sidebar-header__logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 18V16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 14V6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="sidebar-header__title">TG Admin</h1>
          </div>
        </div>

        {/* Menu */}
        <div className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-menu__link ${isActive ? 'sidebar-menu__link--active' : ''}`}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        
        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-footer__content">
            <div className="sidebar-footer__user">
              <div className="sidebar-footer__avatar">
                <span className="sidebar-footer__avatar-text">
                  {(admin?.first_name || admin?.username || 'A')[0].toUpperCase()}
                </span>
              </div>
              <div className="sidebar-footer__info">
                <p className="sidebar-footer__name">
                  {admin?.first_name || admin?.username || 'Admin'}
                </p>
                <p className="sidebar-footer__role">
                  {admin?.role}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowDiagnostics(true)}
                className="sidebar-logout"
                style={{
                  background: 'transparent',
                  border: '1px solid #374151',
                  color: '#9ca3af',
                  padding: '8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
                title="Диагностика системы"
              >
                <Bug size={16} />
              </button>
              <button
                onClick={handleRefreshToken}
                disabled={refreshingToken}
                className="sidebar-logout"
                style={{
                  background: 'transparent',
                  border: '1px solid #374151',
                  color: '#9ca3af',
                  padding: '8px',
                  borderRadius: '6px',
                  cursor: refreshingToken ? 'not-allowed' : 'pointer',
                  opacity: refreshingToken ? 0.6 : 1,
                }}
                title="Обновить токен"
              >
                <RefreshCw size={16} className={refreshingToken ? 'animate-spin' : ''} />
              </button>
              <button onClick={logout} className="sidebar-logout">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="main-content">
        {children}
      </main>

      {/* Diagnostics Panel */}
      {showDiagnostics && (
        <DiagnosticsPanel onClose={() => setShowDiagnostics(false)} />
      )}
    </div>
  );
}

