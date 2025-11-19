/**
 * Скрипт для проверки статуса бота перед переносом на сервер
 * Использование: node check-bot-status.js YOUR_BOT_TOKEN
 */

const axios = require('axios');

const botToken = process.argv[2];

if (!botToken) {
  console.error('❌ Укажите токен бота: node check-bot-status.js YOUR_BOT_TOKEN');
  process.exit(1);
}

async function checkBotStatus() {
  try {
    console.log('🔍 Проверка статуса бота...\n');
    
    // 1. Проверка информации о боте
    const botInfo = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`);
    console.log('✅ Бот найден:');
    console.log(`   Имя: ${botInfo.data.result.first_name}`);
    console.log(`   Username: @${botInfo.data.result.username}`);
    console.log(`   ID: ${botInfo.data.result.id}\n`);
    
    // 2. Проверка webhook
    const webhookInfo = await axios.get(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const webhook = webhookInfo.data.result;
    
    console.log('📡 Статус Webhook:');
    if (webhook.url) {
      console.log(`   ⚠️  Webhook активен: ${webhook.url}`);
      console.log(`   Ожидающих обновлений: ${webhook.pending_update_count || 0}`);
      console.log(`   Последняя ошибка: ${webhook.last_error_message || 'нет'}`);
      console.log(`   Последняя ошибка: ${webhook.last_error_date ? new Date(webhook.last_error_date * 1000).toLocaleString() : 'нет'}\n`);
      
      console.log('💡 Рекомендация: Удалите webhook перед использованием polling:');
      console.log(`   curl -X POST "https://api.telegram.org/bot${botToken}/deleteWebhook?drop_pending_updates=true"\n`);
    } else {
      console.log('   ✅ Webhook не настроен (можно использовать polling)\n');
    }
    
    // 3. Проверка последних обновлений
    const updates = await axios.get(`https://api.telegram.org/bot${botToken}/getUpdates`, {
      params: {
        offset: -1,
        limit: 1,
        timeout: 1
      }
    });
    
    console.log('📨 Последние обновления:');
    if (updates.data.result && updates.data.result.length > 0) {
      const lastUpdate = updates.data.result[0];
      console.log(`   Последний update_id: ${lastUpdate.update_id}`);
      console.log(`   Дата: ${new Date(lastUpdate.message?.date * 1000 || Date.now()).toLocaleString()}\n`);
    } else {
      console.log('   Нет обновлений\n');
    }
    
    // 4. Рекомендации
    console.log('📋 Рекомендации для переноса на сервер:');
    console.log('   1. Убедитесь, что на сервере нет других процессов с этим токеном');
    console.log('   2. Удалите webhook, если он настроен');
    console.log('   3. Проверьте, что на сервере нет других Docker контейнеров с этим ботом');
    console.log('   4. После переноса перезапустите backend\n');
    
  } catch (error) {
    if (error.response) {
      console.error(`❌ Ошибка API: ${error.response.status} - ${error.response.data.description || error.response.data.error_code}`);
    } else {
      console.error(`❌ Ошибка: ${error.message}`);
    }
    process.exit(1);
  }
}

checkBotStatus();

