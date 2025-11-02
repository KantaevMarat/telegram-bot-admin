import { create } from 'zustand';
import { telegramWebApp, TelegramUser } from '../telegram/telegram';

interface TelegramStore {
  isAvailable: boolean;
  initData: string;
  user: TelegramUser | null;
  theme: 'light' | 'dark';
  platform: string;
  version: string;
  
  // Actions
  initialize: () => void;
  getInitData: () => string;
  getUser: () => TelegramUser | null;
}

export const useTelegramStore = create<TelegramStore>((set, get) => ({
  isAvailable: false,
  initData: '',
  user: null,
  theme: 'light',
  platform: 'unknown',
  version: '0.0',

  initialize: () => {
    const isAvailable = telegramWebApp.isAvailable();
    const initData = telegramWebApp.getInitData();
    const user = telegramWebApp.getUser() || null;
    const theme = telegramWebApp.getTheme();
    const platform = telegramWebApp.webApp?.platform || 'unknown';
    const version = telegramWebApp.webApp?.version || '0.0';

    console.log('🤖 Telegram Web App initialized:', {
      isAvailable,
      hasInitData: !!initData,
      hasUser: !!user,
      theme,
      platform,
      version,
    });

    set({
      isAvailable,
      initData,
      user,
      theme,
      platform,
      version,
    });
  },

  getInitData: () => get().initData,
  getUser: () => get().user,
}));

