"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const readline = __importStar(require("readline"));
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
function question(query) {
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
        console.log('\n⏳ Setting webhook...');
        const response = await axios_1.default.post(`https://api.telegram.org/bot${botToken}/setWebhook`, {
            url: webhookUrl,
            allowed_updates: ['message', 'callback_query'],
        });
        if (response.data.ok) {
            console.log('✅ Webhook set successfully!');
            console.log(`📡 Webhook URL: ${webhookUrl}`);
            const info = await axios_1.default.get(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
            console.log('\n📊 Webhook Info:');
            console.log(JSON.stringify(info.data.result, null, 2));
        }
        else {
            console.error('❌ Failed to set webhook:', response.data);
        }
    }
    catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
    finally {
        rl.close();
    }
}
main();
//# sourceMappingURL=setup-webhook.js.map