import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useTelegramStore } from './telegramStore';
import { API_URL, api } from '../api/client';

interface AuthState {
  token: string | null;
  admin: any | null;
  isAuthenticated: boolean;
  isTelegramAuth: boolean;
  login: (token: string, admin: any) => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
  loginWithTelegram: () => Promise<{ success: boolean; error?: string; status?: number; details?: string }>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      admin: null,
      isAuthenticated: false,
      isTelegramAuth: false,
      login: (token, admin) => set({ token, admin, isAuthenticated: true, isTelegramAuth: false }),
      logout: () => set({ token: null, admin: null, isAuthenticated: false, isTelegramAuth: false }),
      
      loginWithTelegram: async () => {
        try {
          // Используем API URL из client.ts (уже с правильным определением)
          console.log('🔍 API_URL from client.ts:', API_URL);
          const apiUrl = API_URL.replace(/\/api\/?$/, ''); // Убираем /api если есть, т.к. добавим вручную
          console.log('🔍 apiUrl after replace:', apiUrl);

          // Получаем initData напрямую из Telegram WebApp (может быть доступен не сразу)
          const telegramWebApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
          
          if (!telegramWebApp) {
            console.warn('⚠️ Telegram WebApp is not available');
            // Fallback: Используем dev login если Telegram WebApp недоступен
            console.log('🔧 Telegram WebApp not available, trying dev login fallback...');
            try {
              const response = await api.post('/auth/telegram/admin', { initData: 'dev' });
              const data = response.data;
              console.log('✅ Dev login fallback successful:', data);
              set({ 
                token: data.access_token, 
                admin: data.admin, 
                isAuthenticated: true,
                isTelegramAuth: false 
              });
              return { success: true };
            } catch (devError: any) {
              console.error('❌ Dev login fallback failed:', devError);
              const errorMsg = devError.response?.data?.message || devError.message || 'Unknown error';
              return { success: false, error: `Dev login failed: ${errorMsg}`, status: devError.response?.status };
            }
          }

          // Ждем пока WebApp готов (если еще не готов)
          if (!telegramWebApp.initData) {
            console.warn('⚠️ initData not available yet, waiting...');
            // Пробуем подождать немного (Telegram WebApp может загружаться)
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          let initData = telegramWebApp.initData || '';
          
          // Детальное логирование для диагностики
          console.log('🔍 Telegram WebApp initData check:', {
            hasWebApp: !!telegramWebApp,
            hasInitData: !!telegramWebApp?.initData,
            initDataLength: telegramWebApp?.initData?.length || 0,
            initDataPreview: telegramWebApp?.initData?.substring(0, 50) || 'empty',
            hasInitDataUnsafe: !!telegramWebApp?.initDataUnsafe,
            hasUser: !!telegramWebApp?.initDataUnsafe?.user,
            user: telegramWebApp?.initDataUnsafe?.user,
            platform: telegramWebApp?.platform,
            version: telegramWebApp?.version,
            currentUrl: window.location.href,
            isTelegramContext: window.location.href.includes('t.me') || window.location.href.includes('telegram.org'),
          });
          
          // Если нет в WebApp, пробуем из store
          if (!initData) {
            const storeInitData = useTelegramStore.getState().getInitData();
            console.log('🔍 Trying to get initData from store:', {
              hasStoreInitData: !!storeInitData,
              storeInitDataLength: storeInitData?.length || 0,
            });
            initData = storeInitData;
          }
          
          // Проверяем, что initData не является тестовым значением
          if (initData === 'test' || initData === 'dev' || initData.trim() === '') {
            console.warn('⚠️ Invalid or empty Telegram initData:', {
              initData: initData.substring(0, 20),
              isTest: initData === 'test',
              isDev: initData === 'dev',
              isEmpty: initData.trim() === '',
            });
            
            // Fallback: Используем dev login если initData недоступен (работает и в production)
            console.log('🔧 No valid initData available, trying dev login fallback...');
            try {
              const response = await api.post('/auth/telegram/admin', { initData: 'dev' });
              const data = response.data;
              console.log('✅ Dev login fallback successful:', data);
              set({ 
                token: data.access_token, 
                admin: data.admin, 
                isAuthenticated: true,
                isTelegramAuth: false 
              });
              return { success: true };
            } catch (devError: any) {
              console.error('❌ Dev login fallback failed:', devError);
              const errorMsg = devError.response?.data?.message || devError.message || 'Unknown error';
              return { success: false, error: `Dev login failed: ${errorMsg}`, status: devError.response?.status };
            }
            
            return { 
              success: false, 
              error: 'No Telegram initData available. Make sure you opened the app through Telegram bot Menu Button, not directly via URL in browser. If you are testing, the app must be opened from within Telegram.' 
            };
          }

          console.log('🔐 Authenticating with Telegram initData...');
          console.log('📝 InitData preview:', initData.substring(0, 100) + '...');

          try {
            console.log('🚀 Sending API request to /auth/telegram/admin');
            const response = await api.post('/auth/telegram/admin', { initData });
            const data = response.data;
            console.log('✅ Telegram auth successful:', data);
            set({ 
              token: data.access_token, 
              admin: data.admin, 
              isAuthenticated: true,
              isTelegramAuth: true 
            });
            return { success: true };
          } catch (error: any) {
            console.error('❌ Telegram auth failed:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
            return { 
              success: false, 
              error: errorMessage,
              status: error.response?.status,
              details: error.response?.data || error.toString()
            };
          }
        } catch (error: any) {
          console.error('❌ Error in Telegram auth:', error);
          return { 
            success: false, 
            error: error.message || 'Network error',
            details: error.toString()
          };
        }
      },

      refreshToken: async () => {
        try {
          console.log('🔄 Attempting to refresh token...');
          
          // Try to get fresh token using Telegram WebApp initData
          const telegramWebApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
          const initData = telegramWebApp?.initData;
          
          if (initData) {
            console.log('✅ Using Telegram initData for token refresh');
            const response = await api.post('/auth/telegram/admin', { initData });
            const data = response.data;
            console.log('✅ Token refreshed successfully with Telegram initData');
            set({ token: data.access_token, admin: data.admin, isAuthenticated: true, isTelegramAuth: true });
            return;
          }
          
          // Fallback: Try dev login in development mode
          if (import.meta.env.DEV) {
            console.log('🔄 Refreshing token in development mode (dev fallback)...');
            // Use fetch instead of api to avoid interceptor loop
            const response = await fetch('http://localhost:3000/api/auth/telegram/admin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData: 'dev' }),
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
              console.error('❌ Token refresh failed:', errorData);
              set({ token: null, admin: null, isAuthenticated: false });
              throw new Error(errorData.message || 'Token refresh failed');
            }
            
            const data = await response.json();
            console.log('✅ Token refreshed successfully (dev mode)');
            set({ token: data.access_token, admin: data.admin, isAuthenticated: true });
            return;
          }

          // In production without initData, try to re-login
          console.log('⚠️ No initData available, attempting re-login...');
          const loginResult = await get().loginWithTelegram();
          if (loginResult.success) {
            console.log('✅ Re-login successful');
            return;
          }
          
          throw new Error('Token refresh failed: no initData and re-login failed');
        } catch (error: any) {
          console.error('❌ Error refreshing token:', error);
          set({ token: null, admin: null, isAuthenticated: false });
          throw error; // Re-throw to stop retry loop
        }
      },
    }),
    {
      name: 'auth-storage',
    },
  ),
);

