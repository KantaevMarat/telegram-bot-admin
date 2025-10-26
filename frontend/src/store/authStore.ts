import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  admin: any | null;
  isAuthenticated: boolean;
  login: (token: string, admin: any) => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      admin: null,
      isAuthenticated: false,
      login: (token, admin) => set({ token, admin, isAuthenticated: true }),
      logout: () => set({ token: null, admin: null, isAuthenticated: false }),
      refreshToken: async () => {
        try {
          // Try to get fresh token in development mode
          if (import.meta.env.DEV) {
            console.log('🔄 Refreshing token in development mode...');
            const response = await fetch('http://localhost:3000/api/auth/telegram/admin', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ initData: 'dev' }),
            });

            if (response.ok) {
              const data = await response.json();
              console.log('✅ Token refreshed successfully');
              set({ token: data.access_token, admin: data.admin, isAuthenticated: true });
              return;
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

