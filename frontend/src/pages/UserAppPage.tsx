import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tasksApi, authApi } from '../api/client';
import { Coins, Trophy, Users, Gift, AlertCircle, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  description: string;
  reward_min: number;
  reward_max: number;
  action_url?: string;
  max_per_user: number;
  active: boolean;
}

interface UserStats {
  balance: number;
  tasks_completed: number;
  total_earned: number;
  referrals: number;
}

export default function UserAppPage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<UserStats>({ balance: 0, tasks_completed: 0, total_earned: 0, referrals: 0 });
  const [isBlocked, setIsBlocked] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    // Initialize Telegram Web App
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      
      // Get user data from Telegram
      const telegramUser = tg.initDataUnsafe?.user;
      if (telegramUser) {
        setUser(telegramUser);
        
        // Check user status (blocked/active)
        checkUserStatus();
      } else {
        setIsCheckingStatus(false);
      }
    } else {
      setIsCheckingStatus(false);
    }
  }, []);

  const checkUserStatus = async () => {
    try {
      const tg = window.Telegram?.WebApp;
      if (!tg?.initData) {
        setIsCheckingStatus(false);
        return;
      }

      const status = await authApi.getUserStatus(tg.initData);
      
      if (status.blocked) {
        setIsBlocked(true);
        toast.error('Ваш аккаунт заблокирован. Обратитесь к администратору.', {
          duration: 10000,
          icon: '🔒',
        });
      }
      
      setIsCheckingStatus(false);
    } catch (error: any) {
      console.error('Error checking user status:', error);
      // If error, allow access (might be new user or network issue)
      setIsCheckingStatus(false);
    }
  };

  // Fetch tasks (only if not blocked)
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['user-tasks'],
    queryFn: () => tasksApi.getTasks().then(res => res.filter((t: Task) => t.active)),
    refetchInterval: 10000,
    enabled: !isBlocked && !isCheckingStatus, // Don't fetch if blocked or checking status
  });

  // Mock user stats (in real app, fetch from API)
  useEffect(() => {
    if (user) {
      // Fetch user stats from backend
      // For now, using mock data
      setStats({
        balance: 125.50,
        tasks_completed: 15,
        total_earned: 325.00,
        referrals: 3,
      });
    }
  }, [user]);

  const handleTaskClick = (task: Task) => {
    if (isBlocked) {
      toast.error('Ваш аккаунт заблокирован. Выполнение заданий недоступно.');
      return;
    }
    
    if (task.action_url) {
      window.open(task.action_url, '_blank');
    }
    toast.success(`Откройте задание "${task.title}" и выполните его, затем вернитесь в бот для подтверждения`);
  };

  // Show blocked message if user is blocked
  if (isBlocked) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '500px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <Lock size={40} color="white" />
          </div>
          <h1 style={{
            margin: '0 0 16px 0',
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#1f2937',
          }}>
            Аккаунт заблокирован
          </h1>
          <p style={{
            margin: '0 0 24px 0',
            fontSize: '16px',
            color: '#6b7280',
            lineHeight: '1.6',
          }}>
            Ваш аккаунт был заблокирован администратором. 
            Для получения дополнительной информации обратитесь в поддержку.
          </p>
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '16px',
            marginTop: '24px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#991b1b',
              fontSize: '14px',
            }}>
              <AlertCircle size={20} />
              <span>Доступ к боту временно ограничен</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while checking status
  if (isCheckingStatus) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ margin: 0, fontSize: '16px', opacity: 0.9 }}>
            Проверка доступа...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '20px',
        marginBottom: '20px',
        color: 'white',
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
          👋 Привет, {user?.first_name || 'друг'}!
        </h1>
        <p style={{ margin: '8px 0 0 0', opacity: 0.8 }}>
          Выполняйте задания и зарабатывайте
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '16px',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Coins size={20} />
            <span style={{ fontSize: '12px', opacity: 0.8 }}>Баланс</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {stats.balance} USDT
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '16px',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Trophy size={20} />
            <span style={{ fontSize: '12px', opacity: 0.8 }}>Выполнено</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {stats.tasks_completed}
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '16px',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Gift size={20} />
            <span style={{ fontSize: '12px', opacity: 0.8 }}>Заработано</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {stats.total_earned} USDT
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '16px',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Users size={20} />
            <span style={{ fontSize: '12px', opacity: 0.8 }}>Рефералов</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {stats.referrals}
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '20px',
        color: 'white',
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 'bold' }}>
          📋 Доступные задания
        </h2>

        {tasksLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', opacity: 0.6 }}>
            Загрузка заданий...
          </div>
        ) : !tasks || tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', opacity: 0.6 }}>
            Нет доступных заданий
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tasks.map((task: Task) => (
              <div
                key={task.id}
                onClick={() => handleTaskClick(task)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.98)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
                      {task.title}
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
                      {task.description}
                    </p>
                  </div>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '4px 12px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                  }}>
                    💰 {task.reward_min}-{task.reward_max}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '20px',
        textAlign: 'center',
        color: 'white',
        opacity: 0.6,
        fontSize: '12px',
      }}>
        Вернитесь в бот для подтверждения выполнения заданий
      </div>
    </div>
  );
}

