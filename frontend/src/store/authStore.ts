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
            // Use localhost when running locally, ignore Docker hostnames
            let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const isDockerHostname = apiUrl.includes('tg-backend') || apiUrl.includes('tg-frontend');
            if (isDockerHostname) {
              apiUrl = 'http://localhost:3000';
            }
            
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

