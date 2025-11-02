// Telegram Web App API wrapper
declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramInitData;
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  BackButton: TelegramBackButton;
  MainButton: TelegramMainButton;
  HapticFeedback: TelegramHapticFeedback;
  ready: () => void;
  expand: () => void;
  close: () => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  onEvent: (eventType: string, callback: () => void) => void;
  offEvent: (eventType: string, callback: () => void) => void;
  sendData: (data: string) => void;
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
  showPopup: (params: TelegramPopupParams, callback?: (buttonId: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  showScanQrPopup: (params: { text?: string }, callback?: (data: string) => boolean) => void;
  closeScanQrPopup: () => void;
  readTextFromClipboard: (callback?: (text: string) => void) => void;
  requestWriteAccess: (callback?: (granted: boolean) => void) => void;
  requestContact: (callback?: (granted: boolean, contact?: TelegramContact) => void) => void;
  isVersionAtLeast: (version: string) => boolean;
}

export interface TelegramInitData {
  query_id?: string;
  user?: TelegramUser;
  receiver?: TelegramUser;
  chat?: TelegramChat;
  chat_type?: string;
  chat_instance?: string;
  start_param?: string;
  can_send_after?: number;
  auth_date: number;
  hash: string;
}

export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
  title: string;
  username?: string;
  photo_url?: string;
}

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

export interface TelegramBackButton {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
}

export interface TelegramMainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
  setText: (text: string) => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
  show: () => void;
  hide: () => void;
  enable: () => void;
  disable: () => void;
  showProgress: (leaveActive?: boolean) => void;
  hideProgress: () => void;
  setParams: (params: Partial<TelegramMainButton>) => void;
}

export interface TelegramHapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
}

export interface TelegramPopupParams {
  title?: string;
  message: string;
  buttons?: Array<{
    id?: string;
    type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
    text?: string;
  }>;
}

export interface TelegramContact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  user_id?: number;
}

// Helper class
export class TelegramWebAppHelper {
  private static instance: TelegramWebAppHelper;
  public webApp: TelegramWebApp | null = null;

  private constructor() {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      this.webApp = window.Telegram.WebApp;
      this.init();
    }
  }

  static getInstance(): TelegramWebAppHelper {
    if (!TelegramWebAppHelper.instance) {
      TelegramWebAppHelper.instance = new TelegramWebAppHelper();
    }
    return TelegramWebAppHelper.instance;
  }

  private init() {
    if (this.webApp) {
      this.webApp.ready();
      this.webApp.expand();
      this.applyTheme();
      
      // Логируем для отладки
      console.log('🔍 Telegram WebApp init check:', {
        hasInitData: !!this.webApp.initData,
        initDataLength: this.webApp.initData?.length || 0,
        hasInitDataUnsafe: !!this.webApp.initDataUnsafe,
        hasUser: !!this.webApp.initDataUnsafe?.user,
        user: this.webApp.initDataUnsafe?.user,
      });
    }
  }

  isAvailable(): boolean {
    return this.webApp !== null;
  }

  getInitData(): string {
    return this.webApp?.initData || '';
  }

  getUser(): TelegramUser | undefined {
    return this.webApp?.initDataUnsafe?.user;
  }

  getTheme(): 'light' | 'dark' {
    return this.webApp?.colorScheme || 'light';
  }

  getThemeParams(): TelegramThemeParams {
    return this.webApp?.themeParams || {};
  }

  private applyTheme() {
    if (!this.webApp) return;

    const params = this.webApp.themeParams;
    const root = document.documentElement;

    if (params.bg_color) {
      root.style.setProperty('--tg-bg-color', params.bg_color);
    }
    if (params.text_color) {
      root.style.setProperty('--tg-text-color', params.text_color);
    }
    if (params.button_color) {
      root.style.setProperty('--tg-button-color', params.button_color);
    }
    if (params.button_text_color) {
      root.style.setProperty('--tg-button-text-color', params.button_text_color);
    }
    if (params.secondary_bg_color) {
      root.style.setProperty('--tg-secondary-bg-color', params.secondary_bg_color);
    }
  }

  showMainButton(text: string, onClick: () => void) {
    if (!this.webApp?.MainButton) return;

    this.webApp.MainButton.setText(text);
    this.webApp.MainButton.onClick(onClick);
    this.webApp.MainButton.show();
  }

  hideMainButton() {
    this.webApp?.MainButton.hide();
  }

  showBackButton(onClick: () => void) {
    if (!this.webApp?.BackButton) return;

    this.webApp.BackButton.onClick(onClick);
    this.webApp.BackButton.show();
  }

  hideBackButton() {
    this.webApp?.BackButton.hide();
  }

  hapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning') {
    if (!this.webApp?.HapticFeedback) return;

    if (type === 'success' || type === 'error' || type === 'warning') {
      this.webApp.HapticFeedback.notificationOccurred(type);
    } else {
      this.webApp.HapticFeedback.impactOccurred(type);
    }
  }

  showAlert(message: string): Promise<void> {
    return new Promise((resolve) => {
      if (this.webApp?.showAlert) {
        this.webApp.showAlert(message, () => resolve());
      } else {
        alert(message);
        resolve();
      }
    });
  }

  showConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.webApp?.showConfirm) {
        this.webApp.showConfirm(message, (confirmed) => resolve(confirmed));
      } else {
        resolve(confirm(message));
      }
    });
  }

  close() {
    this.webApp?.close();
  }

  openLink(url: string) {
    this.webApp?.openLink(url);
  }

  openTelegramLink(url: string) {
    this.webApp?.openTelegramLink(url);
  }
}

// Export singleton instance
export const telegramWebApp = TelegramWebAppHelper.getInstance();

