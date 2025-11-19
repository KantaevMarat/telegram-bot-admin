import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Detect API URL based on current location
const getApiUrl = () => {
  const currentUrl = window.location.href;
  console.log('🔗 Current URL:', currentUrl);

  // Priority 1: Check environment variable (highest priority)
  // Always use VITE_API_URL if it's set
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
    
    // Check if current URL is production domain (not localhost)
    const isProductionDomain = !currentUrl.includes('localhost') && 
                              !currentUrl.includes('127.0.0.1') &&
                              !currentUrl.includes('serveo.net') &&
                              !currentUrl.includes('ngrok.io') &&
                              !currentUrl.includes('trycloudflare.com') &&
                              !currentUrl.includes('loca.lt');
    
    // If VITE_API_URL is a production URL (starts with https://)
    // BUT: If we're on app.marranasuete.ru, ALWAYS use same-origin API to avoid CORS/network issues
    if (envApiUrl.startsWith('https://')) {
      const currentOrigin = window.location.origin;
      const isOnAppDomain = currentOrigin.includes('app.marranasuete.ru');
      
      // ALWAYS use same-origin API when on app.marranasuete.ru (regardless of VITE_API_URL)
      if (isOnAppDomain) {
        const sameOriginApi = `${currentOrigin}/api`;
        console.log('🔧 On app.marranasuete.ru, FORCING same-origin API:', sameOriginApi);
        console.log('⚠️ Ignoring VITE_API_URL to avoid network/CORS issues');
        console.log('⚠️ VITE_API_URL was:', envApiUrl);
        return sameOriginApi;
      }
      
      console.log('🔧 Using VITE_API_URL from env (production URL):', envApiUrl);
      return envApiUrl;
    }
    
    // If VITE_API_URL points to localhost:3000, ALWAYS use it (even if we're on localhost:5173)
    if (envApiUrl.includes('localhost:3000') || envApiUrl.includes('127.0.0.1:3000')) {
      console.log('🔧 Using VITE_API_URL from env (localhost:3000):', envApiUrl);
      return envApiUrl;
    }
    
    // If VITE_API_URL points to Docker-internal but we're on production domain, ignore it
    if (isDockerInternal && isProductionDomain) {
      console.log('⚠️ Ignoring Docker-internal VITE_API_URL on production domain:', envApiUrl);
      console.log('⚠️ Current URL is production:', currentUrl);
      // Fall through to next priority
    } else if (isDockerInternal && (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1'))) {
      console.log('⚠️ Ignoring Docker-internal VITE_API_URL in local browser:', envApiUrl);
      // Fall through to next priority (will use localhost:3000)
    } else {
      // Use VITE_API_URL for any other case
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
  
  // Priority 3: Running locally (localhost or 127.0.0.1) - CHECK THIS FIRST before Telegram WebApp
  if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
    const apiUrl = 'http://localhost:3000/api';
    console.log('🏠 Local development - using localhost API:', apiUrl);
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
    console.warn('⚠️ Telegram Mini App detected, but VITE_API_URL was not used. Using same origin API:', telegramApiUrl);
    console.warn('⚠️ This should not happen if VITE_API_URL is set to a production URL!');
    return telegramApiUrl;
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

// Force correct baseURL if it's wrong (safety check)
if (api.defaults.baseURL !== API_URL) {
  console.warn('⚠️ baseURL mismatch detected, fixing...');
  console.warn('⚠️ Expected:', API_URL);
  console.warn('⚠️ Got:', api.defaults.baseURL);
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

console.log('🔧 Axios instance created with baseURL:', api.defaults.baseURL);
console.log('🔧 Full API URL will be:', API_URL);
console.log('🔧 API_URL === baseURL?', api.defaults.baseURL === API_URL);

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
  
  // Всегда логируем для scenarios запросов
  if (isScenariosRequest) {
    console.log('🔍 SCENARIOS REQUEST DETECTED:', { url, fullUrl, hasData: !!config.data, dataType: typeof config.data });
  }
  
  if (config.data && typeof config.data === 'object' && isScenariosRequest) {
    const hasIsActive = 'is_active' in config.data;
    console.log('🔍 Checking for is_active...', { hasIsActive, dataKeys: Object.keys(config.data) });
    
    if (hasIsActive) {
      console.warn('⚠️ WARNING: is_active found in request data, converting to active!');
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
      console.log('✅ Cleaned data (is_active -> active):', JSON.stringify(cleanData, null, 2));
    }
  }
  
  console.log('🌐 API Request:', config.method?.toUpperCase(), config.url);
  console.log('📝 Full URL:', config.baseURL + config.url);
  if (config.data) {
    try {
      const dataStr = JSON.stringify(config.data, null, 2);
      console.log('📦 Request data:', dataStr);
      // Проверяем наличие is_active в данных после очистки
      if (config.data && typeof config.data === 'object' && 'is_active' in config.data) {
        console.error('❌ ERROR: is_active still in request data after cleanup!', config.data);
      }
    } catch (e) {
      console.log('📦 Request data (cannot stringify):', config.data);
    }
  } else {
    console.log('📦 Request data: (no data)');
  }
  console.log('🔑 Request headers:', config.headers);
  console.log('🔑 Has Authorization:', !!config.headers.Authorization);
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
      if (error.response?.data) {
        console.error('❌ Error details:', JSON.stringify(error.response.data, null, 2));
        // Если это ошибка валидации, показываем детали
        if (error.response.data.message) {
          if (Array.isArray(error.response.data.message)) {
            console.error('❌ Validation errors:');
            error.response.data.message.forEach((err: any) => {
              if (typeof err === 'object' && err.property) {
                console.error(`  - ${err.property}: ${Object.values(err.constraints || {}).join(', ')}`);
              } else {
                console.error(`  - ${err}`);
              }
            });
          } else {
            console.error('❌ Error message:', error.response.data.message);
          }
        }
      } else {
        console.error('❌ Error details:', error.message);
      }
    }
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
      console.error('❌ Token refresh already attempted, logging out...');
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    // Don't retry refresh for auth endpoints or if already retried
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/');
    if (error.response?.status === 401 && import.meta.env.DEV && !originalRequest._retry && !isAuthEndpoint) {
      console.log('🔄 401 error detected, attempting token refresh...');
      originalRequest._retry = true;

      try {
        // Try to refresh token
        await useAuthStore.getState().refreshToken();

        // Get fresh token from store after refresh
        const newToken = useAuthStore.getState().token;
        console.log('🔑 New token after refresh:', newToken ? `${newToken.substring(0, 20)}...` : 'null');
        
        if (newToken && originalRequest) {
          console.log('✅ Token refreshed, retrying request...');
          // Update authorization header
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          // Retry the original request
          return api.request(originalRequest);
        } else {
          console.error('❌ No token after refresh, logging out');
          useAuthStore.getState().logout();
          return Promise.reject(error);
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed, logging out:', refreshError);
        // Force logout on refresh failure and stop retry
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }
    } else if (error.response?.status === 401) {
      // If 401 and can't refresh, logout immediately
      if (!originalRequest._retry && !isAuthEndpoint) {
        console.log('🔄 401 error, logging out...');
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
  testButton: (id: string, testData?: any) => api.post(`/admin/buttons/${id}/test`, testData).then(res => res.data),
  testButtonConfig: (config: any) => api.post('/admin/buttons/test-config', config).then(res => res.data),
  exportButton: (id: string) => api.post(`/admin/buttons/${id}/export`).then(res => res.data),
};

// Scenarios API
export const scenariosApi = {
  getScenarios: (params?: any) => api.get('/admin/scenarios', { params }).then(res => res.data),
  getScenario: (id: string) => api.get(`/admin/scenarios/${id}`).then(res => res.data),
  createScenario: (data: any) => {
    console.log('🚀 scenariosApi.createScenario CALLED!', new Date().toISOString());
    console.log('🚀 scenariosApi.createScenario: Input data:', JSON.stringify(data, null, 2));
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
    console.log('🔧 scenariosApi.createScenario: Clean data:', JSON.stringify(cleanData, null, 2));
    console.log('🔧 scenariosApi.createScenario: Has is_active?', 'is_active' in cleanData);
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
    console.log('🔧 scenariosApi.updateScenario: Original data:', data);
    console.log('🔧 scenariosApi.updateScenario: Clean data:', cleanData);
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

