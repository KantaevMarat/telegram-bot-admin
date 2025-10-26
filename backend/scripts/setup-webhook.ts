import axios from 'axios';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log('🤖 Telegram Bot Webhook Setup\n');

  const botToken = await question('Enter your Telegram Bot Token: ');
  const webhookUrl = await question('Enter your webhook URL (e.g., https://yourdomain.com/bot/webhook): ');

  if (!botToken || !webhookUrl) {
    console.error('❌ Bot token and webhook URL are required!');
    process.exit(1);
  }

  try {
    // Set webhook
    console.log('\n⏳ Setting webhook...');
    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
      }
    );

    if (response.data.ok) {
      console.log('✅ Webhook set successfully!');
      console.log(`📡 Webhook URL: ${webhookUrl}`);
      
      // Get webhook info
      const info = await axios.get(
        `https://api.telegram.org/bot${botToken}/getWebhookInfo`
      );
      
      console.log('\n📊 Webhook Info:');
      console.log(JSON.stringify(info.data.result, null, 2));
    } else {
      console.error('❌ Failed to set webhook:', response.data);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  } finally {
    rl.close();
  }
}

main();

