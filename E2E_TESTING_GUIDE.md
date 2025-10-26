# 🧪 E2E TESTING GUIDE С МОКАМИ

## 📋 Содержание

1. [Настройка E2E тестирования](#настройка-e2e-тестирования)
2. [Mock для Telegram API](#mock-для-telegram-api)
3. [Тестовые сценарии](#тестовые-сценарии)
4. [Команды запуска](#команды-запуска)
5. [Troubleshooting](#troubleshooting)

---

## 🛠️ Настройка E2E тестирования

### Установка зависимостей

```bash
cd backend

# Установить дополнительные зависимости для E2E
npm install --save-dev @faker-js/faker nock supertest
```

### Структура E2E тестов

```
backend/
├── test/
│   ├── e2e/
│   │   ├── auth.e2e-spec.ts
│   │   ├── users.e2e-spec.ts
│   │   ├── tasks.e2e-spec.ts
│   │   ├── balance.e2e-spec.ts
│   │   ├── broadcast.e2e-spec.ts
│   │   └── bot.e2e-spec.ts
│   ├── mocks/
│   │   ├── telegram-api.mock.ts
│   │   └── test-data.factory.ts
│   ├── helpers/
│   │   ├── test-db.helper.ts
│   │   └── auth.helper.ts
│   └── jest-e2e.json
```

---

## 🤖 Mock для Telegram API

### Создание Mock сервиса

Создайте файл `backend/test/mocks/telegram-api.mock.ts`:

```typescript
import nock from 'nock';

export class TelegramApiMock {
  private readonly baseUrl = 'https://api.telegram.org';
  private botToken: string;

  constructor(botToken: string = 'test-bot-token') {
    this.botToken = botToken;
  }

  /**
   * Mock для setWebhook
   */
  mockSetWebhook(webhookUrl: string, options: { success?: boolean } = {}) {
    const success = options.success !== false;

    return nock(this.baseUrl)
      .post(`/bot${this.botToken}/setWebhook`)
      .reply(200, {
        ok: success,
        result: success,
        description: success ? 'Webhook was set' : 'Failed to set webhook',
      });
  }

  /**
   * Mock для deleteWebhook
   */
  mockDeleteWebhook(options: { success?: boolean } = {}) {
    const success = options.success !== false;

    return nock(this.baseUrl)
      .post(`/bot${this.botToken}/deleteWebhook`)
      .reply(200, {
        ok: success,
        result: success,
        description: success ? 'Webhook was deleted' : 'Failed to delete webhook',
      });
  }

  /**
   * Mock для getWebhookInfo
   */
  mockGetWebhookInfo(webhookUrl?: string) {
    return nock(this.baseUrl)
      .get(`/bot${this.botToken}/getWebhookInfo`)
      .reply(200, {
        ok: true,
        result: {
          url: webhookUrl || '',
          has_custom_certificate: false,
          pending_update_count: 0,
          max_connections: 40,
        },
      });
  }

  /**
   * Mock для sendMessage
   */
  mockSendMessage(options: {
    chatId?: number;
    text?: string;
    success?: boolean;
  } = {}) {
    const { chatId = 123456789, text, success = true } = options;

    return nock(this.baseUrl)
      .post(`/bot${this.botToken}/sendMessage`, (body: any) => {
        if (chatId && body.chat_id !== chatId) return false;
        if (text && body.text !== text) return false;
        return true;
      })
      .reply(200, {
        ok: success,
        result: success
          ? {
              message_id: Math.floor(Math.random() * 100000),
              from: {
                id: 123456789,
                is_bot: true,
                first_name: 'Test Bot',
                username: 'test_bot',
              },
              chat: {
                id: chatId,
                first_name: 'Test User',
                type: 'private',
              },
              date: Math.floor(Date.now() / 1000),
              text: text || 'Test message',
            }
          : null,
      });
  }

  /**
   * Mock для sendPhoto
   */
  mockSendPhoto(options: { chatId?: number; success?: boolean } = {}) {
    const { chatId = 123456789, success = true } = options;

    return nock(this.baseUrl)
      .post(`/bot${this.botToken}/sendPhoto`)
      .reply(200, {
        ok: success,
        result: success
          ? {
              message_id: Math.floor(Math.random() * 100000),
              from: {
                id: 123456789,
                is_bot: true,
                first_name: 'Test Bot',
                username: 'test_bot',
              },
              chat: {
                id: chatId,
                first_name: 'Test User',
                type: 'private',
              },
              date: Math.floor(Date.now() / 1000),
              photo: [
                {
                  file_id: 'test-file-id',
                  file_unique_id: 'test-unique-id',
                  width: 100,
                  height: 100,
                  file_size: 1024,
                },
              ],
            }
          : null,
      });
  }

  /**
   * Mock для getMe
   */
  mockGetMe(botUsername: string = 'test_bot') {
    return nock(this.baseUrl)
      .get(`/bot${this.botToken}/getMe`)
      .reply(200, {
        ok: true,
        result: {
          id: 123456789,
          is_bot: true,
          first_name: 'Test Bot',
          username: botUsername,
          can_join_groups: true,
          can_read_all_group_messages: false,
          supports_inline_queries: false,
        },
      });
  }

  /**
   * Очистить все моки
   */
  cleanAll() {
    nock.cleanAll();
  }

  /**
   * Создать mock incoming update (webhook)
   */
  static createMockUpdate(type: 'message' | 'callback_query', data: any = {}) {
    const baseUpdate = {
      update_id: Math.floor(Math.random() * 1000000),
    };

    if (type === 'message') {
      return {
        ...baseUpdate,
        message: {
          message_id: Math.floor(Math.random() * 100000),
          from: {
            id: data.userId || 123456789,
            is_bot: false,
            first_name: data.firstName || 'Test',
            last_name: data.lastName || 'User',
            username: data.username || 'testuser',
            language_code: 'en',
          },
          chat: {
            id: data.chatId || 123456789,
            first_name: data.firstName || 'Test',
            last_name: data.lastName || 'User',
            username: data.username || 'testuser',
            type: 'private',
          },
          date: Math.floor(Date.now() / 1000),
          text: data.text || '/start',
          entities: data.entities || [],
        },
      };
    }

    if (type === 'callback_query') {
      return {
        ...baseUpdate,
        callback_query: {
          id: `${Math.floor(Math.random() * 1000000)}`,
          from: {
            id: data.userId || 123456789,
            is_bot: false,
            first_name: data.firstName || 'Test',
            username: data.username || 'testuser',
          },
          message: {
            message_id: Math.floor(Math.random() * 100000),
            from: {
              id: 123456789,
              is_bot: true,
              first_name: 'Test Bot',
              username: 'test_bot',
            },
            chat: {
              id: data.chatId || 123456789,
              type: 'private',
            },
            date: Math.floor(Date.now() / 1000),
            text: 'Test message',
          },
          chat_instance: `${Math.floor(Math.random() * 1000000)}`,
          data: data.callbackData || 'button_clicked',
        },
      };
    }

    return baseUpdate;
  }
}
```

### Фабрика тестовых данных

Создайте файл `backend/test/mocks/test-data.factory.ts`:

```typescript
import { faker } from '@faker-js/faker';

export class TestDataFactory {
  /**
   * Создать тестового пользователя
   */
  static createUser(overrides: any = {}) {
    return {
      tg_id: overrides.tg_id || faker.number.int({ min: 100000000, max: 999999999 }).toString(),
      username: overrides.username || faker.internet.userName(),
      first_name: overrides.first_name || faker.person.firstName(),
      last_name: overrides.last_name || faker.person.lastName(),
      balance: overrides.balance || 0,
      referrer_id: overrides.referrer_id || null,
      language_code: overrides.language_code || 'en',
      is_premium: overrides.is_premium || false,
      ...overrides,
    };
  }

  /**
   * Создать тестовое задание
   */
  static createTask(overrides: any = {}) {
    return {
      title: overrides.title || faker.lorem.sentence(),
      description: overrides.description || faker.lorem.paragraph(),
      reward_min: overrides.reward_min || faker.number.int({ min: 1, max: 10 }),
      reward_max: overrides.reward_max || faker.number.int({ min: 10, max: 100 }),
      link: overrides.link || faker.internet.url(),
      is_active: overrides.is_active !== undefined ? overrides.is_active : true,
      max_completions: overrides.max_completions || 1,
      ...overrides,
    };
  }

  /**
   * Создать тестовый вывод
   */
  static createPayout(overrides: any = {}) {
    return {
      amount: overrides.amount || faker.number.float({ min: 20, max: 1000, precision: 0.01 }),
      wallet_address: overrides.wallet_address || faker.finance.ethereumAddress(),
      status: overrides.status || 'pending',
      ...overrides,
    };
  }

  /**
   * Создать тестового админа
   */
  static createAdmin(overrides: any = {}) {
    return {
      tg_id: overrides.tg_id || faker.number.int({ min: 100000000, max: 999999999 }).toString(),
      username: overrides.username || faker.internet.userName(),
      role: overrides.role || 'admin',
      ...overrides,
    };
  }

  /**
   * Создать тестовую кнопку
   */
  static createButton(overrides: any = {}) {
    return {
      text: overrides.text || faker.lorem.words(2),
      action_type: overrides.action_type || 'send_message',
      action_value: overrides.action_value || faker.lorem.sentence(),
      order: overrides.order || 0,
      is_active: overrides.is_active !== undefined ? overrides.is_active : true,
      ...overrides,
    };
  }
}
```

---

## 📝 Тестовые сценарии

### E2E Тест: Auth Module

Создайте файл `backend/test/e2e/auth.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { TestDataFactory } from '../mocks/test-data.factory';

describe('Auth Module (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminTgId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    dataSource = app.get(DataSource);

    // Создать тестового админа
    const adminData = TestDataFactory.createAdmin({
      tg_id: '999999999',
      username: 'test_admin',
      role: 'superadmin',
    });
    await dataSource.query(
      `INSERT INTO admins (tg_id, username, role) VALUES ($1, $2, $3)`,
      [adminData.tg_id, adminData.username, adminData.role],
    );
    adminTgId = adminData.tg_id;
  });

  afterAll(async () => {
    // Очистить тестовые данные
    await dataSource.query(`DELETE FROM admins WHERE tg_id = $1`, [adminTgId]);
    await app.close();
  });

  describe('/api/auth/admin/login (POST)', () => {
    it('should login admin successfully', () => {
      return request(app.getHttpServer())
        .post('/api/auth/admin/login')
        .send({
          tg_id: adminTgId,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('admin');
          expect(res.body.admin.tg_id).toBe(adminTgId);
        });
    });

    it('should reject non-existent admin', () => {
      return request(app.getHttpServer())
        .post('/api/auth/admin/login')
        .send({
          tg_id: '000000000',
        })
        .expect(401);
    });

    it('should validate request body', () => {
      return request(app.getHttpServer())
        .post('/api/auth/admin/login')
        .send({
          invalid_field: 'test',
        })
        .expect(400);
    });
  });
});
```

### E2E Тест: Bot Webhook

Создайте файл `backend/test/e2e/bot.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { TelegramApiMock } from '../mocks/telegram-api.mock';

describe('Bot Webhook (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let telegramMock: TelegramApiMock;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    telegramMock = new TelegramApiMock(process.env.TELEGRAM_BOT_TOKEN || 'test-token');
  });

  afterAll(async () => {
    telegramMock.cleanAll();
    await app.close();
  });

  beforeEach(() => {
    // Mock Telegram API responses
    telegramMock.mockSendMessage({ success: true });
  });

  afterEach(() => {
    telegramMock.cleanAll();
  });

  describe('/api/bot/webhook (POST)', () => {
    it('should handle /start command', async () => {
      const update = TelegramApiMock.createMockUpdate('message', {
        userId: 111111111,
        username: 'testuser',
        firstName: 'Test',
        text: '/start',
      });

      await request(app.getHttpServer())
        .post('/api/bot/webhook')
        .send(update)
        .expect(200);

      // Проверить что пользователь создан в БД
      const user = await dataSource.query(
        `SELECT * FROM users WHERE tg_id = $1`,
        ['111111111'],
      );

      expect(user).toHaveLength(1);
      expect(user[0].username).toBe('testuser');
    });

    it('should handle /balance command', async () => {
      // Создать тестового пользователя
      await dataSource.query(
        `INSERT INTO users (tg_id, username, first_name, balance) VALUES ($1, $2, $3, $4)`,
        ['222222222', 'balancetest', 'Balance', 100.5],
      );

      const update = TelegramApiMock.createMockUpdate('message', {
        userId: 222222222,
        username: 'balancetest',
        text: '/balance',
      });

      await request(app.getHttpServer())
        .post('/api/bot/webhook')
        .send(update)
        .expect(200);

      // Verify bot sent message with balance
      // (проверка через nock assertions)
    });

    it('should handle callback queries', async () => {
      const update = TelegramApiMock.createMockUpdate('callback_query', {
        userId: 333333333,
        callbackData: 'test_button',
      });

      await request(app.getHttpServer())
        .post('/api/bot/webhook')
        .send(update)
        .expect(200);
    });
  });

  describe('Cleanup', () => {
    afterAll(async () => {
      // Очистить тестовых пользователей
      await dataSource.query(`DELETE FROM users WHERE tg_id IN ($1, $2)`, [
        '111111111',
        '222222222',
      ]);
    });
  });
});
```

### E2E Тест: Tasks Module

Создайте файл `backend/test/e2e/tasks.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { TestDataFactory } from '../mocks/test-data.factory';

describe('Tasks Module (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);

    // Создать тестового админа и получить токен
    const adminData = TestDataFactory.createAdmin();
    await dataSource.query(
      `INSERT INTO admins (tg_id, username, role) VALUES ($1, $2, $3)`,
      [adminData.tg_id, adminData.username, adminData.role],
    );

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/admin/login')
      .send({ tg_id: adminData.tg_id });

    adminToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    // Cleanup
    await dataSource.query(`DELETE FROM admins WHERE role = 'admin'`);
    await app.close();
  });

  describe('/api/tasks (POST)', () => {
    it('should create new task', () => {
      const taskData = TestDataFactory.createTask({
        title: 'Test Task E2E',
        reward_min: 10,
        reward_max: 50,
      });

      return request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(taskData)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe('Test Task E2E');
        });
    });

    it('should reject without auth', () => {
      const taskData = TestDataFactory.createTask();

      return request(app.getHttpServer())
        .post('/api/tasks')
        .send(taskData)
        .expect(401);
    });
  });

  describe('/api/tasks (GET)', () => {
    it('should get all tasks', () => {
      return request(app.getHttpServer())
        .get('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});
```

---

## 🚀 Команды запуска

### Создайте скрипт для E2E тестов

В `backend/package.json` добавьте:

```json
{
  "scripts": {
    "test:e2e": "NODE_ENV=test jest --config ./test/jest-e2e.json --runInBand",
    "test:e2e:watch": "NODE_ENV=test jest --config ./test/jest-e2e.json --watch",
    "test:e2e:cov": "NODE_ENV=test jest --config ./test/jest-e2e.json --coverage",
    "test:e2e:clean": "npm run test:e2e && npm run db:test:clean"
  }
}
```

### Создайте отдельную конфигурацию для тестовой БД

`.env.test`:

```env
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tg_app_test
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=test-jwt-secret-32-characters
TELEGRAM_BOT_TOKEN=test-bot-token
```

### Скрипт для подготовки тестовой БД

`backend/scripts/prepare-test-db.sh`:

```bash
#!/bin/bash

# Создать тестовую БД
docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS tg_app_test;"
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE tg_app_test;"

# Запустить миграции
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tg_app_test npm run migration:run

echo "Test database prepared successfully!"
```

### Полный E2E тест запуск

Создайте `e2e-test.sh`:

```bash
#!/bin/bash

set -e

echo "=== Starting E2E Tests ==="

# 1. Запустить инфраструктуру если не запущена
echo "Starting infrastructure..."
docker-compose up -d postgres redis

# Подождать пока БД будет готова
sleep 5

# 2. Подготовить тестовую БД
echo "Preparing test database..."
./scripts/prepare-test-db.sh

# 3. Запустить E2E тесты
echo "Running E2E tests..."
npm run test:e2e

# 4. Очистить тестовую БД (опционально)
# echo "Cleaning up test database..."
# docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS tg_app_test;"

echo "=== E2E Tests Completed ==="
```

### Команды запуска

```bash
# Подготовка
chmod +x e2e-test.sh
chmod +x scripts/prepare-test-db.sh

# Запуск E2E тестов
./e2e-test.sh

# Или по отдельности
npm run test:e2e                    # Все E2E тесты
npm run test:e2e -- auth.e2e-spec  # Конкретный файл
npm run test:e2e:watch              # Watch mode
npm run test:e2e:cov                # С coverage
```

---

## 🐛 Troubleshooting

### Тесты не могут подключиться к БД

```bash
# Проверить что PostgreSQL запущен
docker-compose ps postgres

# Проверить подключение
docker-compose exec postgres psql -U postgres -c "SELECT 1;"

# Проверить что тестовая БД создана
docker-compose exec postgres psql -U postgres -c "\l" | grep tg_app_test
```

### Nock перехватывает не все запросы

```typescript
// Включить логирование nock
beforeAll(() => {
  nock.recorder.rec({
    output_objects: true,
    logging: console.log,
  });
});

// Проверить неперехваченные запросы
afterEach(() => {
  const pendingMocks = nock.pendingMocks();
  if (pendingMocks.length > 0) {
    console.log('Pending mocks:', pendingMocks);
  }
});
```

### Тесты не очищают данные

```typescript
// Добавить глобальный cleanup
afterEach(async () => {
  // Очистить все таблицы
  await dataSource.query(`TRUNCATE users, tasks, user_tasks, payouts RESTART IDENTITY CASCADE`);
});
```

### Тайм-ауты в тестах

```typescript
// Увеличить таймаут для конкретного теста
it('should handle long operation', async () => {
  // ...
}, 30000); // 30 секунд

// Или глобально в jest-e2e.json
{
  "testTimeout": 30000
}
```

---

## 📊 Coverage

### Настройка coverage для E2E

В `test/jest-e2e.json`:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "../",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "collectCoverageFrom": [
    "src/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.interface.ts",
    "!src/**/*.dto.ts",
    "!src/**/*.entity.ts"
  ],
  "coverageDirectory": "./coverage-e2e",
  "coverageReporters": ["text", "html", "lcov"]
}
```

### Запуск с coverage

```bash
npm run test:e2e:cov

# Открыть HTML отчет
open coverage-e2e/index.html
```

---

## ✅ Checklist E2E тестов

### Критичные сценарии (MUST HAVE)

- [ ] **Auth**: Логин админа (успешный и неуспешный)
- [ ] **Bot**: /start команда создает пользователя
- [ ] **Bot**: /balance команда возвращает баланс
- [ ] **Tasks**: Создание задания
- [ ] **Tasks**: Выполнение задания пользователем
- [ ] **Balance**: Начисление баланса
- [ ] **Balance**: Списание баланса
- [ ] **Payouts**: Создание заявки на вывод
- [ ] **Payouts**: Одобрение/отклонение вывода
- [ ] **Broadcast**: Массовая рассылка

### Дополнительные сценарии

- [ ] **Users**: CRUD операции
- [ ] **Buttons**: Создание и действия кнопок
- [ ] **Scenarios**: Сценарии взаимодействия
- [ ] **Settings**: Обновление настроек
- [ ] **Stats**: Получение статистики
- [ ] **Referral**: Реферальная система

---

**Конец руководства по E2E тестированию**

Следующие шаги:
1. Реализовать mock классы
2. Написать E2E тесты для критичных модулей
3. Интегрировать в CI/CD pipeline
4. Достичь 60%+ coverage

