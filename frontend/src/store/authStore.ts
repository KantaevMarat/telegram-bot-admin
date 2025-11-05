import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useTelegramStore } from './telegramStore';
import { API_URL } from '../api/client';

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
          const apiUrl = API_URL.replace(/\/api\/?$/, ''); // Убираем /api если есть, т.к. добавим вручную

          // Получаем initData напрямую из Telegram WebApp (может быть доступен не сразу)
          const telegramWebApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
          
          if (!telegramWebApp) {
            console.warn('⚠️ Telegram WebApp is not available');
            // Fallback: Используем dev login если Telegram WebApp недоступен
            console.log('🔧 Telegram WebApp not available, trying dev login fallback...');
            try {
              const response = await fetch(`${apiUrl}/api/auth/telegram/admin`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ initData: 'dev' }),
              });

              if (response.ok) {
                const data = await response.json();
                console.log('✅ Dev login fallback successful:', data);
                set({ 
                  token: data.access_token, 
                  admin: data.admin, 
                  isAuthenticated: true,
                  isTelegramAuth: false 
                });
                return { success: true };
              } else {
                console.warn('⚠️ Dev login fallback failed with status:', response.status);
              }
            } catch (devError) {
              console.error('❌ Dev login fallback failed:', devError);
            }
            return { success: false, error: 'Telegram WebApp is not available. Make sure you opened the app through Telegram.' };
          }

          // Ждем пока WebApp готов (если еще не готов)
          if (!telegramWebApp.initData) {
            console.warn('⚠️ initData not available yet, waiting...');
            // Пробуем подождать немного (Telegram WebApp может загружаться)
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          let initData = telegramWebApp.initData || '';
          
          // Если нет в WebApp, пробуем из store
          if (!initData) {
            initData = useTelegramStore.getState().getInitData();
          }
          
          if (!initData || initData.trim() === '') {
            console.warn('⚠️ No Telegram initData available');
            console.warn('⚠️ Telegram WebApp debug:', {
              exists: !!telegramWebApp,
              hasInitData: !!telegramWebApp?.initData,
              initDataLength: telegramWebApp?.initData?.length || 0,
              initDataUnsafe: !!telegramWebApp?.initDataUnsafe,
              initDataUnsafeUser: telegramWebApp?.initDataUnsafe?.user,
            });
            
            // Fallback: Используем dev login если initData недоступен (работает и в production)
            console.log('🔧 No initData available, trying dev login fallback...');
            try {
              const response = await fetch(`${apiUrl}/api/auth/telegram/admin`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ initData: 'dev' }),
              });

              if (response.ok) {
                const data = await response.json();
                console.log('✅ Dev login fallback successful:', data);
                set({ 
                  token: data.access_token, 
                  admin: data.admin, 
                  isAuthenticated: true,
                  isTelegramAuth: false 
                });
                return { success: true };
              } else {
                console.warn('⚠️ Dev login fallback failed with status:', response.status);
              }
            } catch (devError) {
              console.error('❌ Dev login fallback failed:', devError);
            }
            
            return { success: false, error: 'No Telegram initData available. Make sure you opened the app through Telegram bot Menu Button, not directly via URL in browser.' };
          }

          console.log('🔐 Authenticating with Telegram initData...');
          console.log('📝 InitData preview:', initData.substring(0, 100) + '...');

          // apiUrl уже определен выше
          const endpoint = `${apiUrl}/api/auth/telegram/admin`;
          console.log('🌐 API URL:', endpoint);

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ initData }),
          });

          console.log('📡 Response status:', response.status);
          console.log('📡 Response headers:', response.headers);

          if (response.ok) {
            const data = await response.json();
            console.log('✅ Telegram auth successful:', data);
            set({ 
              token: data.access_token, 
              admin: data.admin, 
              isAuthenticated: true,
              isTelegramAuth: true 
            });
            return { success: true };
          } else {
            let errorText = '';
            let errorJson = null;
            
            try {
              errorText = await response.text();
              errorJson = JSON.parse(errorText);
            } catch (e) {
              // Если не JSON, используем текст
            }

            const errorMessage = errorJson?.message || errorText || `HTTP ${response.status}`;
            
            console.error('❌ Telegram auth failed:', {
              status: response.status,
              statusText: response.statusText,
              error: errorMessage,
              fullResponse: errorText,
            });

            return { 
              success: false, 
              error: errorMessage,
              status: response.status,
              details: errorText
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
          // Try to get fresh token in development mode
          if (import.meta.env.DEV) {
            console.log('🔄 Refreshing token in development mode...');
            // Use localhost when running locally, ignore Docker hostnames
            let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const isDockerHostname = apiUrl.includes('tg-backend') || apiUrl.includes('tg-frontend');
            if (isDockerHostname) {
              apiUrl = 'http://localhost:3000';
            }

            // Убираем /api из конца если есть (чтобы не дублировать)
            apiUrl = apiUrl.replace(/\/api\/?$/, '');
            
            const response = await fetch(`${apiUrl}/api/auth/telegram/admin`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ initData: 'dev' }),
            });

            console.log('🔄 Token refresh response status:', response.status);
            console.log('🔄 Token refresh response headers:', response.headers);

            if (response.ok) {
              const data = await response.json();
              console.log('✅ Token refreshed successfully:', data);
              set({ token: data.access_token, admin: data.admin, isAuthenticated: true });
              return;
            } else {
              const errorText = await response.text();
              console.log('❌ Token refresh failed with status:', response.status, 'body:', errorText);
            }
          }

          console.log('❌ Token refresh failed');
        } catch (error) {
          console.error('❌ Error refreshing token:', error);
        }
      },
    }),
    {
      name: 'auth-storage',
    },
  ),
);

