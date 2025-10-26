import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
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
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { admin, logout } = useAuthStore();

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
    { path: '/chats', icon: MessageSquare, label: 'Чаты', color: '#10b981' },
    { path: '/admins', icon: Shield, label: 'Админы', color: '#ef4444' },
  ];

  return (
    <div className="main-layout" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav
        className="sidebar"
        style={{
          width: '240px',
          background: 'var(--bg-primary)',
          padding: '1rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--border-dark)',
          transition: 'all 0.2s ease'
        }}
      >
        {/* Logo */}
        <div
          className="sidebar-header"
          style={{
            padding: '0.75rem 0.5rem',
            marginBottom: '1.5rem',
            borderBottom: '1px solid var(--border-dark)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'var(--accent)',
              padding: '0.5rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 18V16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 14V6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.025em'
            }}>
              TG Admin
            </h1>
          </div>
        </div>

        {/* Menu */}
        <div className="sidebar-menu" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={isActive ? 'active' : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '6px',
                  background: isActive ? 'var(--accent-light)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                <span>{item.label}</span>
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '3px',
                    height: '24px',
                    background: 'var(--accent)',
                    borderRadius: '0 2px 2px 0'
                  }} />
                )}
              </Link>
            );
          })}
        </div>
        
        {/* Footer */}
        <div style={{ marginTop: 'auto' }}>
            <div style={{
                padding: '1rem 0.75rem',
                borderTop: '1px solid var(--border-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      background: 'var(--bg-hover)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border-dark)'
                    }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)'
                      }}>
                        {(admin?.first_name || admin?.username || 'A')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                        <p style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-primary)',
                          fontWeight: 500,
                          lineHeight: 1.2
                        }}>
                            {admin?.first_name || admin?.username || 'Admin'}
                        </p>
                        <p style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-tertiary)',
                          lineHeight: 1.2
                        }}>
                            {admin?.role}
                        </p>
                    </div>
                </div>
                <button
                onClick={logout}
                className="sidebar-logout"
                style={{
                    background: 'transparent',
                    border: '1px solid var(--border-dark)',
                    color: 'var(--text-secondary)',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--error)';
                  e.currentTarget.style.borderColor = 'var(--error)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.borderColor = 'var(--border-dark)';
                }}
                >
                <LogOut size={16} />
                </button>
            </div>
        </div>
      </nav>

      {/* Main content */}
      <main
        className="main-content"
        style={{
          flex: 1,
          padding: '2rem 2.5rem',
          background: 'var(--bg-primary)',
          overflowY: 'auto',
          maxHeight: '100vh',
        }}
      >
        {children}
      </main>
    </div>
  );
}

