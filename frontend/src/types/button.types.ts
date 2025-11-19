/**
 * Типы для системы управления кнопками Telegram
 */

export type ButtonMode = 'command' | 'text' | 'media' | 'url' | 'function' | 'submenu';

export type MediaType = 'photo' | 'video' | 'audio' | 'document';

export type VisibilityType = 'private' | 'group' | 'both';

export type PermissionRole = 'admin' | 'moderator' | 'all';

export interface MediaConfig {
  type: MediaType;
  media_id?: string;
  url?: string;
  caption?: string;
  file?: File; // Для загрузки
}

export interface FunctionConfig {
  type: 'webhook' | 'script' | 'internal';
  url?: string; // Для webhook
  script?: string; // Для script
  function_name?: string; // Для internal
  timeout?: number;
  whitelist?: string[]; // Whitelist для webhook
}

export interface SubButton {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  mode: ButtonMode;
  payload?: string; // Команда, текст, URL
  callback_data?: string;
  media?: MediaConfig;
  function?: FunctionConfig;
  permissions?: PermissionRole[];
  visibility?: VisibilityType;
  schedule?: {
    enabled: boolean;
    start?: string;
    end?: string;
  };
}

export interface Section {
  id: string;
  title: string;
  subbuttons: SubButton[];
}

export interface ButtonConfig {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  callback_data?: string;
  visibility: VisibilityType;
  permissions: PermissionRole[];
  mode: ButtonMode;
  payload?: string; // Команда, текст, URL
  media?: MediaConfig;
  function?: FunctionConfig;
  sections?: Section[]; // Для режима submenu
  schedule?: {
    enabled: boolean;
    start?: string;
    end?: string;
  };
  confirm_before_action?: boolean; // Подтверждение перед выполнением
  active?: boolean; // Активна ли кнопка
}

export interface ButtonValidationError {
  field: string;
  message: string;
}

export interface ButtonTestResult {
  success: boolean;
  payload?: any;
  response?: any;
  error?: string;
  logs?: string[];
}

