import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Detect API URL based on current location
const getApiUrl = () => {
  const currentUrl = window.location.href;
  console.log('🔗 Current URL:', currentUrl);

  // Priority 1: Check environment variable (highest priority)
  // Always use VITE_API_URL if it's set and is a valid production URL
  if (import.meta.env.VITE_API_URL) {
    // Ensure /api suffix exists
    let envApiUrl = import.meta.env.VITE_API_URL;
    if (!envApiUrl.endsWith('/api')) {
      envApiUrl = envApiUrl + '/api';
    }
    
    // Check if this is a Docker-internal or localhost URL
    const isDockerInternal = envApiUrl.includes('tg-backend') || 
                            envApiUrl.includes('tg-frontend') ||
                            envApiUrl.includes('://backend:') ||
                            envApiUrl.includes('://frontend:');
    
    // Check if current URL is production domain (not localhost)
    const isProductionDomain = !currentUrl.includes('localhost') && 
                              !currentUrl.includes('127.0.0.1') &&
                              !currentUrl.includes('serveo.net') &&
                              !currentUrl.includes('ngrok.io') &&
                              !currentUrl.includes('trycloudflare.com') &&
                              !currentUrl.includes('loca.lt');
    
    // If VITE_API_URL is a production URL (starts with https://), always use it
    if (envApiUrl.startsWith('https://')) {
      console.log('🔧 Using VITE_API_URL from env (production URL):', envApiUrl);
      return envApiUrl;
    }
    
    // If VITE_API_URL points to localhost/Docker-internal but we're on production domain, ignore it
    if (isDockerInternal && isProductionDomain) {
      console.log('⚠️ Ignoring Docker-internal/localhost VITE_API_URL on production domain:', envApiUrl);
      console.log('⚠️ Current URL is production:', currentUrl);
    } else if (isDockerInternal && (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1'))) {
      console.log('⚠️ Ignoring Docker-internal VITE_API_URL in local browser:', envApiUrl);
    } else {
      console.log('🔧 Using VITE_API_URL from env:', envApiUrl);
      return envApiUrl;
    }
  }

  // Priority 2: For Telegram Web Apps with tunneling (serveo, ngrok, etc.)
  // Skip this for production Telegram Mini Apps that access via domain directly
  const isTelegramWebApp = window.Telegram?.WebApp?.initData;
  if (!isTelegramWebApp && (currentUrl.includes('serveo.net') || currentUrl.includes('ngrok.io') || currentUrl.includes('trycloudflare.com') || currentUrl.includes('loca.lt'))) {
    const apiUrl = 'http://localhost:3000/api';
    console.log('📱 Telegram Web App with tunnel detected - using localhost API:', apiUrl);
    return apiUrl;
  }
  
  // For Telegram Mini Apps running on production domain
  // Check if Telegram WebApp exists (even without initData)
  const hasTelegramWebApp = typeof window !== 'undefined' && window.Telegram?.WebApp;
  if (hasTelegramWebApp && !currentUrl.includes('localhost') && !currentUrl.includes('127.0.0.1')) {
    const origin = window.location.origin;
    const telegramApiUrl = `${origin}/api`;
    console.log('📱 Telegram Mini App detected - using same origin API:', telegramApiUrl);
    return telegramApiUrl;
  }

  // Priority 3: Running locally (localhost or 127.0.0.1)
  if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
    const apiUrl = 'http://localhost:3000/api';
    console.log('🏠 Local development - using localhost API:', apiUrl);
    return apiUrl;
  }

  // Priority 4: Production environment - use same origin + /api
  const origin = window.location.origin;
  const productionUrl = `${origin}/api`;
  console.log('🚀 Production environment - using same origin API:', productionUrl);
  return productionUrl;
};

export const API_URL = getApiUrl();
console.log('✅ Using API URL:', API_URL);
console.log('📦 Environment variables:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  MODE: import.meta.env.MODE,
  PROD: import.meta.env.PROD,
  DEV: import.meta.env.DEV,
});
console.log('🌐 Window location:', {
  href: window.location.href,
  origin: window.location.origin,
  hostname: window.location.hostname,
});
console.log('📱 Telegram WebApp:', {
  exists: typeof window !== 'undefined' && !!window.Telegram,
  hasWebApp: typeof window !== 'undefined' && !!window.Telegram?.WebApp,
  hasInitData: typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData,
});

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

console.log('🔧 Axios instance created with baseURL:', api.defaults.baseURL);
console.log('🔧 Full API URL will be:', API_URL);

// Add request logging
api.interceptors.request.use((config) => {
  console.log('🌐 API Request:', config.method?.toUpperCase(), config.url);
  console.log('📝 Full URL:', config.baseURL + config.url);
  console.log('📦 Request data:', config.data || '(no data)');
  console.log('🔑 Request headers:', config.headers);
  return config;
});

// Add response logging
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('❌ Network Error - API недоступен:', error.config?.baseURL + error.config?.url);
      console.error('❌ Проверьте:', {
        baseURL: error.config?.baseURL,
        url: error.config?.url,
        fullURL: error.config?.baseURL + error.config?.url,
        message: error.message,
        code: error.code
      });
    } else {
      console.error('❌ API Error:', error.response?.status || 'Unknown', error.config?.url || 'Unknown URL');
      console.error('❌ Error details:', error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

// Add auth token to requests
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

// Handle auth errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && import.meta.env.DEV) {
      console.log('🔄 401 error detected, attempting token refresh...');

      try {
        // Try to refresh token
        await useAuthStore.getState().refreshToken();

        // Retry the original request with new token
        const newToken = useAuthStore.getState().token;
        if (newToken && error.config) {
          console.log('✅ Token refreshed, retrying request...');
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return api.request(error.config);
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        // Force logout on refresh failure
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
    console.log('🔧 Settings API response:', res);
    console.log('🔧 Settings API data:', res.data);
    console.log('🔧 Settings API data length:', res.data?.length);
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
};

// Scenarios API
export const scenariosApi = {
  getScenarios: (params?: any) => api.get('/admin/scenarios', { params }).then(res => res.data),
  getScenario: (id: string) => api.get(`/admin/scenarios/${id}`).then(res => res.data),
  createScenario: (data: any) => api.post('/admin/scenarios', data).then(res => res.data),
  updateScenario: (id: string, data: any) => api.put(`/admin/scenarios/${id}`, data).then(res => res.data),
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

