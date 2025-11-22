import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Detect API URL based on current location
const getApiUrl = () => {
  const currentUrl = window.location.href;

  // Priority 1: Check if we're on production domain
  // If on production domain (app.marranasuete.ru), ALWAYS use same-origin API
  const isProductionDomain = !currentUrl.includes('localhost') &&
    !currentUrl.includes('127.0.0.1') &&
    !currentUrl.includes('serveo.net') &&
    !currentUrl.includes('ngrok.io') &&
    !currentUrl.includes('trycloudflare.com') &&
    !currentUrl.includes('loca.lt');

  if (isProductionDomain) {
    const currentOrigin = window.location.origin;
    const productionApiUrl = `${currentOrigin}/api`;
    return productionApiUrl;
  }

  // Priority 2: Check environment variable (for local development)
  // Only use VITE_API_URL if we're NOT on production domain
  if (import.meta.env.VITE_API_URL) {
    // Ensure /api suffix exists
    let envApiUrl = import.meta.env.VITE_API_URL;
    if (!envApiUrl.endsWith('/api')) {
      envApiUrl = envApiUrl + '/api';
    }

    // Check if this is a Docker-internal URL
    const isDockerInternal = envApiUrl.includes('tg-backend') ||
      envApiUrl.includes('tg-frontend') ||
      envApiUrl.includes('://backend:') ||
      envApiUrl.includes('://frontend:');

    // If VITE_API_URL points to localhost:3000, use it for local development
    if (envApiUrl.includes('localhost:3000') || envApiUrl.includes('127.0.0.1:3000')) {
      return envApiUrl;
    }

    // If VITE_API_URL points to Docker-internal, ignore it in local browser
    if (isDockerInternal && (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1'))) {
      // Fall through to next priority (will use localhost:3000)
    } else if (!isDockerInternal) {
      // Use VITE_API_URL for any other case (non-Docker, non-localhost)
      return envApiUrl;
    }
  }

  // Priority 2: For Telegram Web Apps with tunneling (serveo, ngrok, etc.)
  // Skip this for production Telegram Mini Apps that access via domain directly
  const isTelegramWebApp = window.Telegram?.WebApp?.initData;
  if (!isTelegramWebApp && (currentUrl.includes('serveo.net') || currentUrl.includes('ngrok.io') || currentUrl.includes('trycloudflare.com') || currentUrl.includes('loca.lt'))) {
    const apiUrl = 'http://localhost:3000/api';
    return apiUrl;
  }

  // Priority 3: Running locally (localhost or 127.0.0.1) - CHECK THIS FIRST before Telegram WebApp
  if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
    const apiUrl = 'http://localhost:3000/api';
    return apiUrl;
  }

  // For Telegram Mini Apps running on production domain
  // Check if Telegram WebApp exists (even without initData)
  // BUT: Only use same-origin API if VITE_API_URL is NOT set or is not a production URL
  // IMPORTANT: This should NOT execute if VITE_API_URL was already returned above
  const hasTelegramWebApp = typeof window !== 'undefined' && window.Telegram?.WebApp;
  if (hasTelegramWebApp && !currentUrl.includes('localhost') && !currentUrl.includes('127.0.0.1')) {
    // Double-check: if VITE_API_URL was set and is a production URL, it should have been returned already
    // This is a fallback ONLY if VITE_API_URL was not set or was ignored
    const origin = window.location.origin;
    const telegramApiUrl = `${origin}/api`;
    return telegramApiUrl;
  }

  // Priority 4: Production environment - use same origin + /api
  const origin = window.location.origin;
  const productionUrl = `${origin}/api`;
  return productionUrl;
};

export const API_URL = getApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Force correct baseURL if it's wrong (safety check)
if (api.defaults.baseURL !== API_URL) {
  api.defaults.baseURL = API_URL;
}

// Override axios defaults to handle FormData correctly
api.defaults.transformRequest = [(data, headers) => {
  // If data is FormData, don't set Content-Type - let axios set it automatically with boundary
  if (data instanceof FormData) {
    delete headers['Content-Type'];
    return data;
  }
  // For regular objects, stringify them to JSON
  if (typeof data === 'object' && data !== null) {
    return JSON.stringify(data);
  }
  return data;
}];

// Add auth token to requests (MUST be first interceptor to ensure token is always added)
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Don't set Content-Type for FormData - axios will set it automatically with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Add request logging (after auth token is added)
api.interceptors.request.use((config) => {
  // КРИТИЧЕСКИ ВАЖНО: удаляем is_active из всех запросов к scenarios
  // Делаем это ПЕРВЫМ делом, до любого логирования
  const url = config.url || '';
  const fullUrl = (config.baseURL || '') + url;
  const isScenariosRequest = url.includes('/scenarios') || fullUrl.includes('/scenarios');

  if (config.data && typeof config.data === 'object' && isScenariosRequest) {
    const hasIsActive = 'is_active' in config.data;

    if (hasIsActive) {
      const cleanData: any = {};
      // Копируем только разрешенные поля
      if ('name' in config.data) cleanData.name = config.data.name;
      if ('trigger' in config.data) cleanData.trigger = config.data.trigger;
      if ('response' in config.data && config.data.response) cleanData.response = config.data.response;
      if ('media_url' in config.data && config.data.media_url) cleanData.media_url = config.data.media_url;
      // Преобразуем is_active в active, если active не указан
      if ('active' in config.data) {
        cleanData.active = config.data.active;
      } else if ('is_active' in config.data) {
        cleanData.active = config.data.is_active;
      }
      // Явно НЕ копируем is_active
      config.data = cleanData;
    }
  }

  return config;
});

// Add response logging
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loop if refresh fails
    if (originalRequest._retry) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    // Don't retry refresh for auth endpoints or if already retried
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/');
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        // Try to refresh token (works in both DEV and PROD now)
        await useAuthStore.getState().refreshToken();

        // Get fresh token from store after refresh
        const newToken = useAuthStore.getState().token;

        if (newToken && originalRequest) {
          // Update authorization header
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          // Retry the original request
          return api.request(originalRequest);
        } else {
          useAuthStore.getState().logout();
          return Promise.reject(error);
        }
      } catch (refreshError) {
        // Force logout on refresh failure and stop retry
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }
    } else if (error.response?.status === 401) {
      // If 401 and can't refresh, logout immediately
      if (!originalRequest._retry && !isAuthEndpoint) {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  },
);

// Auth API
export const authApi = {
  loginAdmin: (initData?: string) => api.post('/auth/telegram/admin', { initData: initData || 'dev' }).then(res => res.data),
  loginUser: (initData: string) => api.post('/auth/telegram/user', { initData }).then(res => res.data),
  getUserStatus: (initData: string) => api.post('/auth/telegram/user/status', { initData }).then(res => res.data),
  devLogin: (adminId?: string) => api.post('/auth/telegram/admin', { initData: 'dev' }).then(res => res.data),
};

// Stats API
export const statsApi = {
  getStats: () => api.get('/admin/stats').then(res => res.data),
  getFakeStats: () => api.get('/admin/stats/fake').then(res => res.data),
  getHistory: (days?: number) => api.get('/admin/stats/history', { params: { days } }).then(res => res.data),
  regenerateFakeStats: () => api.post('/admin/stats/fake/regenerate').then(res => res.data),
  getTopUsers: (limit?: number) => api.get('/admin/stats/top-users', { params: { limit } }).then(res => res.data),
};

// Users API
export const usersApi = {
  getUsers: (params?: any) => api.get('/admin/users', { params }).then(res => res.data),
  getUser: (id: string) => api.get(`/admin/users/${id}`).then(res => res.data),
  updateBalance: (tg_id: string, data: any) => api.post(`/admin/users/${tg_id}/balance`, data).then(res => res.data),
  blockUser: (id: string) => api.post(`/admin/users/${id}/block`).then(res => res.data),
  unblockUser: (id: string) => api.post(`/admin/users/${id}/unblock`).then(res => res.data),
  getBalanceLogs: (id: string, limit?: number) => api.get(`/admin/users/${id}/balance-logs`, { params: { limit } }).then(res => res.data),
};

// Payouts API
export const payoutsApi = {
  getPayouts: (params?: any) => api.get('/admin/payouts', { params }).then(res => res.data),
  getPayout: (id: string) => api.get(`/admin/payouts/${id}`).then(res => res.data),
  approvePayout: (id: string) => api.post(`/admin/payouts/${id}/approve`).then(res => res.data),
  declinePayout: (id: string, reason: string) =>
    api.post(`/admin/payouts/${id}/decline`, { reason }).then(res => res.data),
};

// Balance API
export const balanceApi = {
  getOverview: () => api.get('/admin/balance/overview').then(res => res.data),
  getLogs: (params?: any) => api.get('/admin/balance/logs', { params }).then(res => res.data),
  adjustBalance: (tg_id: string, amount: number, reason: string) =>
    api.post(`/admin/users/${tg_id}/balance`, { delta: amount, reason }).then(res => res.data),
};

// Settings API
export const settingsApi = {
  getSettings: () => api.get('/admin/settings').then(res => {
    return res.data;
  }),
  getSetting: (key: string) => api.get(`/admin/settings/${key}`).then(res => res.data),
  updateSetting: (key: string, value: string) => api.put('/admin/settings', { settings: [{ key, value }] }).then(res => res.data),
  upsertSetting: (data: any) => api.post('/admin/settings', data).then(res => res.data),
  deleteSetting: (key: string) => api.delete(`/admin/settings/${key}`).then(res => res.data),
  updateSettings: (data: any) => api.put('/admin/settings', { settings: data }).then(res => res.data),

  // Advanced settings management
  getSettingsByCategories: () => api.get('/admin/settings/categories').then(res => res.data),
  getSettingsByCategory: (category: string) => api.get(`/admin/settings/category/${category}`).then(res => res.data),
  validateSettings: (settings: any) => api.post('/admin/settings/validate', { settings }).then(res => res.data),
  exportSettings: () => api.post('/admin/settings/export').then(res => res.data),
  importSettings: (settings: any) => api.post('/admin/settings/import', { settings }).then(res => res.data),
  resetSettings: (categories?: string[]) => api.post('/admin/settings/reset', { categories }).then(res => res.data),
  getSettingsHistory: (limit?: number, offset?: number) =>
    api.get('/admin/settings/history', { params: { limit, offset } }).then(res => res.data),
  searchSettings: (query: string, category?: string) =>
    api.get('/admin/settings/search', { params: { q: query, category } }).then(res => res.data),
  bulkUpdateSettings: (settings: any) => api.post('/admin/settings/bulk-update', { settings }).then(res => res.data),
};

// Settings History API
export const settingsHistoryApi = {
  getHistory: (limit?: number, offset?: number) =>
    api.get('/admin/settings/history', { params: { limit, offset } }).then(res => res.data),
};

// Broadcast API
export const broadcastApi = {
  sendBroadcast: (data: any) => api.post('/admin/broadcast', data).then(res => res.data),
  getAllBroadcasts: () => api.get('/admin/broadcast').then(res => res.data),
  getBroadcast: (id: string) => api.get(`/admin/broadcast/${id}`).then(res => res.data),
  deleteBroadcast: (id: string) => api.delete(`/admin/broadcast/${id}`).then(res => res.data),
};

// Buttons API
export const buttonsApi = {
  getButtons: (params?: any) => api.get('/admin/buttons', { params }).then(res => res.data),
  getButton: (id: string) => api.get(`/admin/buttons/${id}`).then(res => res.data),
  createButton: (data: any) => api.post('/admin/buttons', data).then(res => res.data),
  updateButton: (id: string, data: any) => api.put(`/admin/buttons/${id}`, data).then(res => res.data),
  deleteButton: (id: string) => api.delete(`/admin/buttons/${id}`).then(res => res.data),
  testButton: (id: string, testData?: any) => api.post(`/admin/buttons/${id}/test`, testData).then(res => res.data),
  testButtonConfig: (config: any) => api.post('/admin/buttons/test-config', config).then(res => res.data),
  exportButton: (id: string) => api.post(`/admin/buttons/${id}/export`).then(res => res.data),
};

// Scenarios API
export const scenariosApi = {
  getScenarios: (params?: any) => api.get('/admin/scenarios', { params }).then(res => res.data),
  getScenario: (id: string) => api.get(`/admin/scenarios/${id}`).then(res => res.data),
  createScenario: (data: any) => {
    // КРИТИЧЕСКИ ВАЖНО: удаляем is_active перед отправкой
    const cleanData: any = {};
    if ('name' in data) cleanData.name = data.name;
    if ('trigger' in data) cleanData.trigger = data.trigger;
    if ('response' in data && data.response) cleanData.response = data.response;
    if ('media_url' in data && data.media_url) cleanData.media_url = data.media_url;
    if ('active' in data) {
      cleanData.active = data.active;
    } else if ('is_active' in data) {
      cleanData.active = data.is_active;
    }
    // Явно НЕ копируем is_active
    return api.post('/admin/scenarios', cleanData).then(res => res.data);
  },
  updateScenario: (id: string, data: any) => {
    // КРИТИЧЕСКИ ВАЖНО: удаляем is_active перед отправкой
    const cleanData: any = {};
    if ('name' in data) cleanData.name = data.name;
    if ('trigger' in data) cleanData.trigger = data.trigger;
    if ('response' in data && data.response) cleanData.response = data.response;
    if ('media_url' in data && data.media_url) cleanData.media_url = data.media_url;
    if ('active' in data) {
      cleanData.active = data.active;
    } else if ('is_active' in data) {
      cleanData.active = data.is_active;
    }
    // Явно НЕ копируем is_active
    return api.put(`/admin/scenarios/${id}`, cleanData).then(res => res.data);
  },
  deleteScenario: (id: string) => api.delete(`/admin/scenarios/${id}`).then(res => res.data),
};

// Tasks API
export const tasksApi = {
  getTasks: (params?: any) => api.get('/admin/tasks', { params }).then(res => res.data),
  getTask: (id: string) => api.get(`/admin/tasks/${id}`).then(res => res.data),
  getTaskStats: (id: string) => api.get(`/admin/tasks/${id}/stats`).then(res => res.data),
  createTask: (data: any) => api.post('/admin/tasks', data).then(res => res.data),
  updateTask: (id: string, data: any) => api.put(`/admin/tasks/${id}`, data).then(res => res.data),
  deleteTask: (id: string) => api.delete(`/admin/tasks/${id}`).then(res => res.data),

  // Moderation
  getPendingReview: (params?: { status?: string; search?: string }) =>
    api.get('/admin/tasks/moderation/pending', { params }).then(res => res.data),
  approveTask: (userTaskId: string) =>
    api.post(`/admin/tasks/moderation/${userTaskId}/approve`).then(res => res.data),
  rejectTask: (userTaskId: string, reason?: string) =>
    api.post(`/admin/tasks/moderation/${userTaskId}/reject`, { reason }).then(res => res.data),
};

// Chats API
export const chatsApi = {
  getChats: () => api.get('/admin/chats').then(res => res.data),
  getUnreadCount: () => api.get('/admin/chats/unread-count').then(res => res.data),
  getMessages: (userId: string, limit?: number) =>
    api.get(`/admin/chats/${userId}/messages`, { params: { limit } }).then(res => res.data),
  sendMessage: (userId: string, data: any) => api.post(`/admin/chats/${userId}/send`, data).then(res => res.data),
};

// Admins API
export const adminsApi = {
  getAdmins: () => api.get('/admin/admins').then(res => res.data),
  getAdmin: (id: string) => api.get(`/admin/admins/${id}`).then(res => res.data),
  createAdmin: (data: any) => api.post('/admin/admins', data).then(res => res.data),
  updateAdmin: (id: string, data: any) => api.put(`/admin/admins/${id}`, data).then(res => res.data),
  deleteAdmin: (id: string) => api.delete(`/admin/admins/${id}`).then(res => res.data),
};

// Media API
export const mediaApi = {
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    // Don't set Content-Type header - axios will set it automatically with boundary for FormData
    return api.post('/admin/media/upload', formData).then(res => res.data);
  },
};

// Commands API
export const commandsApi = {
  getCommands: () => api.get('/admin/commands').then(res => res.data),
  getCommand: (id: string) => api.get(`/admin/commands/${id}`).then(res => res.data),
  createCommand: (data: any) => api.post('/admin/commands', data).then(res => res.data),
  updateCommand: (id: string, data: any) => api.put(`/admin/commands/${id}`, data).then(res => res.data),
  deleteCommand: (id: string) => api.delete(`/admin/commands/${id}`).then(res => res.data),
};

// Ranks API
export const ranksApi = {
  getSettings: () => api.get('/admin/ranks/settings').then(res => res.data),
  updateSettings: (data: any) => api.put('/admin/ranks/settings', data).then(res => res.data),
  getStatistics: () => api.get('/admin/ranks/statistics').then(res => res.data),
  getUserRank: (userId: string) => api.get(`/admin/ranks/user/${userId}`).then(res => res.data),
  checkUserRank: (userId: string) => api.put(`/admin/ranks/user/${userId}/check`).then(res => res.data),
};

// Premium API
export const premiumApi = {
  getRequests: (params?: { status?: string; currency?: string }) =>
    api.get('/admin/premium/requests', { params }).then(res => res.data),
  markRequisitesSent: (id: string) => api.post(`/admin/premium/requests/${id}/requisites-sent`).then(res => res.data),
  confirmPayment: (id: string) => api.post(`/admin/premium/requests/${id}/confirm-payment`).then(res => res.data),
  activateSubscription: (id: string) => api.post(`/admin/premium/requests/${id}/activate`).then(res => res.data),
  cancelRequest: (id: string, reason?: string) =>
    api.post(`/admin/premium/requests/${id}/cancel`, { reason }).then(res => res.data),
};

