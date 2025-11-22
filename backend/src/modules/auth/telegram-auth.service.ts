import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

export interface TelegramInitData {
  query_id?: string;
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    photo_url?: string;
  };
  receiver?: any;
  chat?: any;
  chat_type?: string;
  chat_instance?: string;
  start_param?: string;
  can_send_after?: number;
  auth_date: number;
  hash: string;
}

@Injectable()
export class TelegramAuthService {
  private readonly logger = new Logger(TelegramAuthService.name);
  private readonly adminBotToken: string;
  private readonly userBotToken: string;

  constructor(private configService: ConfigService) {
    this.adminBotToken = this.configService.get('ADMIN_TG_BOT_TOKEN') || this.configService.get('ADMIN_BOT_TOKEN') || '';
    this.userBotToken = this.configService.get('CLIENT_TG_BOT_TOKEN') || this.configService.get('CLIENT_BOT_TOKEN') || '';
    
    if (!this.adminBotToken) {
      this.logger.warn('⚠️ ADMIN_TG_BOT_TOKEN is not configured!');
    }
  }

  /**
   * Проверяет подпись Telegram initData
   * Пытается валидировать с обоими токенами (ADMIN и USER бот)
   * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
   */
  validateInitData(initData: string): TelegramInitData {
    try {
      this.logger.debug(`🔍 Validating initData: ${initData.substring(0, 50)}...`);

      // Парсим initData
      const params = new URLSearchParams(initData);
      const hash = params.get('hash');

      if (!hash) {
        throw new UnauthorizedException('Missing hash in initData');
      }

      // Удаляем hash из параметров для проверки
      params.delete('hash');

      // Сортируем параметры и создаем строку для проверки
      const dataCheckString = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      this.logger.debug(`📝 Data check string:\n${dataCheckString}`);

      // Пробуем валидировать с обоими токенами (ADMIN и USER бот)
      const tokens = [
        { name: 'ADMIN_TG_BOT_TOKEN', token: this.adminBotToken },
        { name: 'CLIENT_TG_BOT_TOKEN', token: this.userBotToken },
      ].filter(t => t.token); // Только те, что настроены

      let isValid = false;
      
      for (const { name, token } of tokens) {
        try {
          // Создаем секретный ключ из токена бота
          const secretKey = createHmac('sha256', 'WebAppData')
            .update(token)
            .digest();

          // Вычисляем hash
          const calculatedHash = createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

          this.logger.debug(`🔐 [${name}] Calculated: ${calculatedHash.substring(0, 10)}...`);
          this.logger.debug(`🔐 [${name}] Received: ${hash.substring(0, 10)}...`);

          // Сравниваем hash
          if (calculatedHash === hash) {
            this.logger.log(`✅ Valid initData signature with ${name}`);
            isValid = true;
            break; // Успешно валидировано
          }
        } catch (tokenError) {
          this.logger.debug(`⚠️ Error validating with ${name}:`, tokenError.message);
        }
      }

      // Если ни один токен не подошел
      if (!isValid) {
        this.logger.error('❌ Invalid initData signature with all tokens');
        throw new UnauthorizedException('Invalid initData signature');
      }

      // Проверяем время авторизации (не старше 24 часов)
      const authDate = parseInt(params.get('auth_date') || '0');
      const now = Math.floor(Date.now() / 1000);
      const maxAge = 24 * 60 * 60; // 24 hours

      if (now - authDate > maxAge) {
        throw new UnauthorizedException('initData is too old');
      }

      // Парсим user data
      const userJson = params.get('user');
      let user: any = null;

      if (userJson) {
        try {
          user = JSON.parse(userJson);
        } catch (error) {
          this.logger.error('Failed to parse user data:', error);
        }
      }

      const result: TelegramInitData = {
        query_id: params.get('query_id') || undefined,
        user,
        auth_date: authDate,
        hash,
      };

      this.logger.log(`✅ Valid initData for user: ${user?.id || 'unknown'} (${user?.first_name || 'N/A'})`);

      return result;
    } catch (error) {
      this.logger.error('❌ Failed to validate initData:', error.message);
      throw new UnauthorizedException('Invalid initData');
    }
  }

  /**
   * Для разработки: создает mock initData
   */
  createMockInitData(userId: number, firstName: string = 'Test User'): TelegramInitData {
    const authDate = Math.floor(Date.now() / 1000);

    return {
      user: {
        id: userId,
        first_name: firstName,
        username: 'testuser',
        language_code: 'ru',
      },
      auth_date: authDate,
      hash: 'mock_hash_for_development',
    };
  }
}

