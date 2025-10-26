// Скрипт для обновления JWT токена в development режиме
const axios = require('axios');

async function updateDevToken() {
  try {
    console.log('🔑 Получение свежего JWT токена...');

    const response = await axios.post('http://localhost:3000/api/auth/telegram/admin', {
      initData: 'dev'
    });

    const token = response.data.access_token;
    console.log('✅ Токен получен:', token.substring(0, 50) + '...');

    // Создаем JavaScript код для обновления токена в браузере
    const updateScript = `
// Обновление токена в development режиме
if (typeof window !== 'undefined' && window.localStorage) {
  const token = '${token}';
  const adminData = ${JSON.stringify(response.data.admin)};

  // Обновляем localStorage
  localStorage.setItem('auth-storage', JSON.stringify({
    state: {
      token: token,
      admin: adminData,
      isAuthenticated: true
    },
    version: 0
  }));

  // Обновляем Zustand store если он доступен
  if (window.useAuthStore) {
    window.useAuthStore.getState().login(token, adminData);
  }

  console.log('🔧 Токен обновлен в localStorage');
  console.log('📋 Новый токен:', token.substring(0, 50) + '...');

  // Перезагружаем страницу чтобы применить изменения
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}
`;

    console.log('📄 Скопируйте следующий код и выполните в консоли браузера:');
    console.log('=' .repeat(60));
    console.log(updateScript);
    console.log('=' .repeat(60));
    console.log('🎯 Откройте http://localhost:5173 в браузере');
    console.log('🔧 Откройте DevTools (F12) -> Console');
    console.log('📋 Вставьте и выполните код выше');
    console.log('🔄 Страница автоматически перезагрузится');

  } catch (error) {
    console.error('❌ Ошибка получения токена:', error.response?.data || error.message);
  }
}

updateDevToken();
