import { useState, useEffect } from 'react';
import { authApi, api, API_URL } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useTelegramStore } from '../store/telegramStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const { login, loginWithTelegram } = useAuthStore();
  const { isAvailable: isTelegramAvailable } = useTelegramStore();

  const handleDevLogin = async () => {
    setLoading(true);
    setLastError(null);
    try {
      console.log('🔧 Development mode login...');
      const response = await authApi.devLogin();
      console.log('✅ Dev login response:', response);
      
      if (response.access_token && response.admin) {
        login(response.access_token, response.admin);
        toast.success('🎉 Успешный вход в dev-режиме!');
      } else {
        throw new Error('Invalid response from dev login');
      }
    } catch (error: any) {
      console.error('❌ Dev login error:', error);
      const errorMsg = error.response?.data?.message || error.message;
      setLastError(errorMsg);
      toast.error('Dev login failed: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setLastError(null); // Очищаем предыдущую ошибку
    try {
      // If Telegram Web App is available, use Telegram auth
      if (isTelegramAvailable) {
        console.log('🤖 Authenticating with Telegram...');
        const result = await loginWithTelegram();
        if (result.success) {
          toast.success('✅ Авторизация успешна!');
          setLastError(null); // Очищаем ошибку при успехе
          setLoading(false);
          return;
        } else {
          // Если в dev режиме и нет initData, dev fallback должен был сработать
          // Но если все равно ошибка, значит dev fallback не сработал
          if (import.meta.env.DEV && result.error?.includes('No Telegram initData')) {
            console.log('🔧 Dev fallback should have worked, checking...');
            // Подождем немного - может dev fallback еще обрабатывается
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Проверим не авторизовались ли мы
            if (useAuthStore.getState().isAuthenticated) {
              toast.success('✅ Авторизация через dev mode успешна!');
              setLastError(null);
              setLoading(false);
              return;
            }
          }
          // Показываем детальную ошибку
          const errorMsg = result.error || 'Неизвестная ошибка';
          const statusMsg = result.status ? ` (HTTP ${result.status})` : '';
          
          console.error('❌ Auth error details:', {
            error: result.error,
            status: result.status,
            details: result.details,
          });

          // Формируем понятное сообщение
          let userMessage = '❌ Ошибка авторизации';
          
          if (errorMsg.includes('Not authorized as admin')) {
            userMessage = '❌ Вы не авторизованы как администратор. Обратитесь к администратору системы.';
          } else if (errorMsg.includes('Invalid initData')) {
            userMessage = '❌ Неверная подпись данных. Убедитесь что вы открыли приложение через Telegram.';
          } else if (errorMsg.includes('User data not found')) {
            userMessage = '❌ Данные пользователя не найдены. Попробуйте обновить страницу.';
          } else if (result.status === 401) {
            userMessage = '❌ Не авторизован. Проверьте что вы добавлены в список администраторов.';
          } else if (result.status === 400) {
            userMessage = `❌ Ошибка запроса: ${errorMsg}`;
          } else {
            userMessage = `❌ Ошибка: ${errorMsg}${statusMsg}`;
          }

          toast.error(userMessage, { duration: 5000 });
          
          // Сохраняем детали ошибки для отображения
          const errorDetails = result.details 
            ? `Status: ${result.status || 'N/A'}\nError: ${result.error || 'Unknown'}\nDetails: ${result.details.substring(0, 200)}`
            : `Status: ${result.status || 'N/A'}\nError: ${result.error || 'Unknown'}`;
          setLastError(errorDetails);
          
          setLoading(false);
          return;
        }
      }

      // For development: if no Telegram WebApp, use mock data
      const isDev = import.meta.env.DEV;
      if (isDev) {
        // Use development login endpoint
        console.log('🚀 Development mode: Using dev login endpoint');
        try {
          const response = await authApi.devLogin('697184435');
          console.log('✅ Dev login response:', response);
          login(response.access_token, response.admin);
          toast.success('🔧 Режим разработки: Успешный вход!');
          setLoading(false);
          return;
        } catch (error: any) {
          console.error('Dev login error:', error);

          // Try to refresh token on auth error
          if (error.response?.status === 401) {
            console.log('🔄 Trying to refresh token...');
            try {
              await useAuthStore.getState().refreshToken();
              const newToken = useAuthStore.getState().token;
              const newAdmin = useAuthStore.getState().admin;

              if (newToken && newAdmin) {
                login(newToken, newAdmin);
                toast.success('🔄 Токен обновлен! Успешный вход!');
                setLoading(false);
                return;
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              // Clear localStorage and try again
              localStorage.removeItem('auth-storage');
              console.log('🗑️ Cleared localStorage, retrying...');
              try {
                await useAuthStore.getState().refreshToken();
                const retryToken = useAuthStore.getState().token;
                const retryAdmin = useAuthStore.getState().admin;

                if (retryToken && retryAdmin) {
                  login(retryToken, retryAdmin);
                  toast.success('🔄 Токен обновлен после очистки! Успешный вход!');
                  setLoading(false);
                  return;
                }
              } catch (retryError) {
                console.error('Retry refresh failed:', retryError);
              }
            }
          }

          toast.error('Ошибка разработки входа: ' + (error.response?.data?.message || error.message));
          setLoading(false);
          return;
        }
      } else {
        toast.error('Откройте приложение через Telegram');
        setLoading(false);
        return;
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  // Auto-login on mount if in Telegram
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      // Only auto-login if we have valid initData
      if (window.Telegram.WebApp.initData) {
        handleLogin();
      }
    }
    // Don't auto-login in dev mode - let user choose
  }, []);

  // Check if already authenticated and refresh token if needed
  useEffect(() => {
    if (import.meta.env.DEV) {
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed.state?.token && parsed.state?.isAuthenticated) {
            console.log('🔑 Found existing token in localStorage');

            // Test if token is valid by making a test request
            testTokenAndRefreshIfNeeded(parsed.state.token);
          }
        } catch (error) {
          console.error('❌ Error parsing auth data:', error);
          localStorage.removeItem('auth-storage');
        }
      }
    }
  }, []);

  const testTokenAndRefreshIfNeeded = async (token: string) => {
    try {
      // Make a test request to see if token is valid
      const response = await fetch('http://localhost:3000/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ Token is valid');
        // Set the token in store if not already set
        if (!useAuthStore.getState().isAuthenticated) {
          const adminData = JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.admin;
          if (adminData) {
            login(token, adminData);
          }
        }
      } else if (response.status === 401) {
        console.log('🔄 Token expired, refreshing...');
        await useAuthStore.getState().refreshToken();
      }
    } catch (error) {
      console.error('❌ Error testing token:', error);
      // Try to refresh token anyway
      try {
        await useAuthStore.getState().refreshToken();
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0a0a0a',
      }}
    >
      <div
        style={{
          background: '#1a1a1a',
          padding: '40px',
          borderRadius: '12px',
          textAlign: 'center',
          maxWidth: '400px',
        }}
      >
        <h1 style={{ marginBottom: '20px' }}>Telegram Admin Panel</h1>
        <p style={{ color: '#888', marginBottom: '30px' }}>
          Войдите через Telegram для доступа к админ-панели
        </p>

        <div style={{ marginBottom: '20px', padding: '10px', background: '#1a1a1a', borderRadius: '8px', fontSize: '12px' }}>
          <strong>Debug Info:</strong><br/>
          Environment: {import.meta.env.DEV ? '🧪 Development' : '🚀 Production'}<br/>
          Telegram WebApp: {window.Telegram?.WebApp ? '✅' : '❌'}<br/>
          initData: {window.Telegram?.WebApp?.initData ? '✅' : (import.meta.env.DEV ? '🔧 Using Dev Mode' : '❌')}<br/>
          API URL: {API_URL}
          {lastError && (
            <>
              <br/>
              <br/>
              <strong style={{ color: '#ff4444' }}>❌ Последняя ошибка:</strong><br/>
              <pre style={{ 
                margin: '8px 0 0 0', 
                padding: '8px', 
                background: '#0a0a0a', 
                borderRadius: '4px',
                color: '#ff6666',
                fontSize: '10px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '150px',
                overflow: 'auto'
              }}>
                {lastError}
              </pre>
            </>
          )}
        </div>

        <button onClick={handleLogin} disabled={loading} style={{ width: '100%', marginBottom: '10px' }}>
          {loading ? 'Вход...' : 'Войти через Telegram'}
        </button>

        {import.meta.env.DEV && (
          <button 
            onClick={handleDevLogin} 
            disabled={loading} 
            style={{ 
              width: '100%', 
              background: '#ff6b35',
              marginTop: '10px'
            }}
          >
            {loading ? 'Вход...' : '🔧 Dev-вход (ID: 697184435)'}
          </button>
        )}
      </div>
    </div>
  );
}

