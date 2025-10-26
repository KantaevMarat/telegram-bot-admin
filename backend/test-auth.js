const crypto = require('crypto');

// Тестовые данные из логов
const initData = 'query_id=AAEB540fAwAAAAHnjR_5eXAQ&user=%7B%22id%22%3A6971844353%2C%22first_name%22%3A%22%F0%9D%93%9C%F0%9D%93%AA%F0%9D%93%BB%F0%9D%93%BB%F0%9D%93%AA%22%2C%22last_name%22%3A%22%22%2C%22username%22%3A%22nabi_arabic%22%2C%22language_code%22%3A%22ru%22%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2FSbEl9yhYqQ5yTm56-wRBJZo0Fvx1b4XrNbnO3UtXkBX_uuD_BVbrX6aAubMS6ElF.svg%22%7D&auth_date=1761224322&signature=MlWVi452KBf-KRsWf3GzMJI09Oont2Zsh7lwUB4Wc9PPze2jBh7Ft4B8BaJsHvNJiak592hd1RZA5yFfKJKGAg&hash=85b59c80fe3677342b86a9fba8d9aec9e0b160e32f6fc8425a2d6a9589365de7';

const botToken = '8216209199:AAG1-P801Q6wn7qrD61UCOz-FUv5qr7AdfM';

console.log('🔍 Testing Telegram Web App validation');
console.log('🔍 Init data:', initData);

const urlParams = new URLSearchParams(initData);
const hash = urlParams.get('hash');
urlParams.delete('hash');
urlParams.delete('signature');

console.log('🔍 Hash from initData:', hash);
console.log('🔍 Params after removal:', Array.from(urlParams.entries()));

// Sort params and create data-check-string
const dataCheckArray = [];
for (const [key, value] of Array.from(urlParams.entries()).sort()) {
  dataCheckArray.push(`${key}=${value}`);
}
const dataCheckString = dataCheckArray.join('\n');

console.log('🔍 Data check string:');
console.log(dataCheckString);

// Try different algorithms
console.log('\n=== Algorithm 1: HMAC(bot_token, WebAppData) ===');
const secretKey1 = crypto.createHmac('sha256', botToken).update('WebAppData').digest();
const calculatedHash1 = crypto.createHmac('sha256', secretKey1).update(dataCheckString).digest('hex');
console.log('🔑 Secret key (first 10 chars):', secretKey1.toString('hex').substring(0, 10));
console.log('🔍 Calculated hash:', calculatedHash1);
console.log('🔍 Original hash:', hash);
console.log('✅ Match:', calculatedHash1 === hash);

console.log('\n=== Algorithm 2: SHA256(bot_token) ===');
const secretKey2 = crypto.createHash('sha256').update(botToken).digest();
const calculatedHash2 = crypto.createHmac('sha256', secretKey2).update(dataCheckString).digest('hex');
console.log('🔑 Secret key (first 10 chars):', secretKey2.toString('hex').substring(0, 10));
console.log('🔍 Calculated hash:', calculatedHash2);
console.log('🔍 Original hash:', hash);
console.log('✅ Match:', calculatedHash2 === hash);

console.log('\n=== Algorithm 3: SHA256(WebAppData + bot_token) ===');
const secretKey3 = crypto.createHash('sha256').update('WebAppData' + botToken).digest();
const calculatedHash3 = crypto.createHmac('sha256', secretKey3).update(dataCheckString).digest('hex');
console.log('🔑 Secret key (first 10 chars):', secretKey3.toString('hex').substring(0, 10));
console.log('🔍 Calculated hash:', calculatedHash3);
console.log('🔍 Original hash:', hash);
console.log('✅ Match:', calculatedHash3 === hash);

console.log('\n=== Algorithm 4: HMAC(bot_token, WebAppData) ===');
const secretKey4 = crypto.createHmac('sha256', botToken).update('WebAppData').digest();
const calculatedHash4 = crypto.createHmac('sha256', secretKey4).update(dataCheckString).digest('hex');
console.log('🔑 Secret key (first 10 chars):', secretKey4.toString('hex').substring(0, 10));
console.log('🔍 Calculated hash:', calculatedHash4);
console.log('🔍 Original hash:', hash);
console.log('✅ Match:', calculatedHash4 === hash);

console.log('\n=== Algorithm 5: HMAC(WebAppData, bot_token) ===');
const secretKey5 = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
const calculatedHash5 = crypto.createHmac('sha256', secretKey5).update(dataCheckString).digest('hex');
console.log('🔑 Secret key (first 10 chars):', secretKey5.toString('hex').substring(0, 10));
console.log('🔍 Calculated hash:', calculatedHash5);
console.log('🔍 Original hash:', hash);
console.log('✅ Match:', calculatedHash5 === hash);

console.log('\n=== Algorithm 6: HMAC(WebAppData, bot_token) with signature ===');
const urlParamsWithSignature = new URLSearchParams(initData);
urlParamsWithSignature.delete('hash');
// Keep signature for validation
const dataCheckArray6 = [];
for (const [key, value] of Array.from(urlParamsWithSignature.entries()).sort()) {
  dataCheckArray6.push(`${key}=${value}`);
}
const dataCheckString6 = dataCheckArray6.join('\n');
console.log('🔍 Data check string with signature:');
console.log(dataCheckString6);

const secretKey6 = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
const calculatedHash6 = crypto.createHmac('sha256', secretKey6).update(dataCheckString6).digest('hex');
console.log('🔑 Secret key (first 10 chars):', secretKey6.toString('hex').substring(0, 10));
console.log('🔍 Calculated hash:', calculatedHash6);
console.log('🔍 Original hash:', hash);
console.log('✅ Match:', calculatedHash6 === hash);
