import { useState, useEffect } from 'react';
import { authApi, api, API_URL } from '../api/client';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      console.log('Telegram initData:', initData);
      console.log('Telegram WebApp:', window.Telegram?.WebApp);

      // For development: if no Telegram WebApp, use mock data
      let finalInitData = initData;

      if (!initData) {
        // Check if we're in development mode
        const isDev = import.meta.env.DEV;
        if (isDev) {
          // Use development login endpoint
          console.log('🚀 Development mode: Using dev login endpoint');
          try {
            const response = await authApi.devLogin('697184435');
            console.log('✅ Dev login response:', response);
            login(response.access_token, response.admin);
            toast.success('🔧 Режим разработки: Успешный вход!');
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
      }

      const response = await authApi.loginAdmin(finalInitData);
      login(response.data.access_token, response.data.admin);
      toast.success('Успешный вход!');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  // Auto-login on mount if in Telegram or development mode
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      handleLogin();
    } else if (import.meta.env.DEV) {
      // Auto-login in development mode with fresh token
      console.log('🚀 Development mode: Attempting auto-login...');
      handleLogin();
    }
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
        </div>

        <button onClick={handleLogin} disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Вход...' : 'Войти через Telegram'}
        </button>
      </div>
    </div>
  );
}

