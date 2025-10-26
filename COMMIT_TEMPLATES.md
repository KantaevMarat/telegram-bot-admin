# 📝 COMMIT MESSAGE TEMPLATES

## 🎯 Conventional Commits Format

Мы используем [Conventional Commits](https://www.conventionalcommits.org/) формат:

```
<type>(<scope>): <short summary>

<optional body>

<optional footer>
```

---

## 📋 Типы коммитов (Types)

### Основные типы

| Type | Описание | Пример |
|------|----------|--------|
| `feat` | Новая функциональность | `feat(tasks): add task completion endpoint` |
| `fix` | Исправление бага | `fix(auth): handle null token in refresh flow` |
| `docs` | Документация | `docs(readme): update installation instructions` |
| `style` | Форматирование кода (не влияет на логику) | `style(backend): format code with prettier` |
| `refactor` | Рефакторинг (без изменения функциональности) | `refactor(users): extract validation logic to separate service` |
| `perf` | Улучшение производительности | `perf(database): add indexes to users table` |
| `test` | Добавление/изменение тестов | `test(auth): add unit tests for login flow` |
| `build` | Изменения в build системе или зависимостях | `build(deps): upgrade @nestjs/core to 10.4.0` |
| `ci` | Изменения в CI/CD | `ci(github): add automated tests workflow` |
| `chore` | Обслуживание (не production код) | `chore(scripts): add database backup script` |
| `revert` | Откат предыдущего коммита | `revert: feat(tasks): add task completion endpoint` |

---

## 🔍 Scope (область изменений)

### Backend scopes

- `auth` - Authentication & Authorization
- `users` - Users management
- `tasks` - Tasks module
- `payouts` - Payouts module
- `balance` - Balance operations
- `bot` - Telegram bot service
- `broadcast` - Broadcast module
- `buttons` - Buttons management
- `scenarios` - Scenarios module
- `settings` - Settings module
- `stats` - Statistics module
- `messages` - Messages module
- `media` - Media upload/storage
- `admin` - Admin operations
- `database` - Database migrations/schema
- `config` - Configuration
- `api` - API endpoints
- `tests` - Test files

### Frontend scopes

- `ui` - UI components
- `pages` - Page components
- `api` - API client
- `store` - State management
- `auth` - Authentication flow
- `dashboard` - Dashboard page
- `users` - Users page
- `tasks` - Tasks page
- `balance` - Balance page
- `payouts` - Payouts page
- `settings` - Settings page
- `styles` - Global styles

### Общие scopes

- `deps` - Dependencies
- `docker` - Docker configuration
- `ci` - CI/CD
- `docs` - Documentation
- `scripts` - Scripts

---

## ✅ Примеры хороших коммитов

### Новая функциональность (feat)

```
feat(tasks): add task completion tracking

- Add user_tasks table to track completions
- Implement completion endpoint with validation
- Add reward calculation logic
- Update task status based on max_completions

Refs: #42
```

```
feat(bot): implement /balance command

Users can now check their balance directly from Telegram bot.

Closes: #38
```

```
feat(broadcast): add throttling for mass messaging

- Implement rate limiting (30 messages per second)
- Add BullMQ queue for message batching
- Add retry logic for failed messages

Breaking Change: Requires Redis to be configured
```

### Исправление бага (fix)

```
fix(auth): handle expired JWT tokens correctly

- Add token expiration check middleware
- Return 401 instead of 500 for expired tokens
- Add tests for token expiration scenarios

Fixes: #127
```

```
fix(payouts): prevent duplicate payout requests

- Add unique constraint on user_id + created_at
- Validate pending payouts before creating new one
- Add error message for duplicate attempts

Refs: #94
```

```
fix(bot): escape HTML in user messages

Prevents XSS in admin panel when viewing user messages.

Security: GHSA-xxxx-yyyy-zzzz
```

### Рефакторинг (refactor)

```
refactor(users): extract balance operations to service

- Create BalanceService for balance operations
- Move credit/debit logic from UsersService
- Update tests to use new service
- No functional changes
```

```
refactor(database): normalize settings table

- Split settings into separate rows instead of JSON
- Add migration for data transformation
- Update queries to use new schema
```

### Тесты (test)

```
test(payouts): add e2e tests for approval flow

- Test successful approval
- Test rejection with reason
- Test insufficient balance scenario
- Test unauthorized access

Coverage: 85% -> 92%
```

```
test(bot): add unit tests for webhook handler

- Mock Telegram API calls
- Test /start, /balance, /tasks commands
- Test callback query handling
```

### Документация (docs)

```
docs(api): update Swagger documentation

- Add request/response examples
- Document error codes
- Add authentication requirements
- Update endpoint descriptions
```

```
docs(deployment): add production deployment guide

- Server requirements
- Environment setup
- Database migration steps
- Nginx configuration
```

### Chore / Build (chore, build)

```
build(deps): upgrade dependencies to fix vulnerabilities

- axios 1.6.5 -> 1.12.2 (fixes CVE-xxxx)
- vite 5.0.11 -> 5.4.21 (fixes dev server exploit)
- Run tests to verify no breaking changes
```

```
chore(scripts): add automated database backup

- Create backup script with compression
- Schedule daily backups via cron
- Keep last 7 backups, delete older
```

### CI/CD (ci)

```
ci(github): add automated deployment workflow

- Deploy to staging on push to develop
- Deploy to production on release tags
- Run tests before deployment
- Add rollback step on failure
```

```
ci(lint): enforce code quality checks

- Run ESLint on all PRs
- Block merge if linting fails
- Add auto-fix on commit
```

---

## ❌ Примеры плохих коммитов

### Плохо: Нет типа и scope

```
❌ updated files
❌ fixes
❌ changes
❌ work in progress
```

### Плохо: Неинформативное сообщение

```
❌ fix(auth): fix bug
❌ feat(tasks): add feature
❌ update(users): update users
```

### Плохо: Слишком много изменений в одном коммите

```
❌ feat: add tasks, fix payouts, update docs, refactor auth
```

**Правильно**: Разбить на отдельные атомарные коммиты

### Плохо: Смешивание нескольких типов

```
❌ feat(tasks): add new endpoint and fix balance bug and update docs
```

**Правильно**: 
```
✅ feat(tasks): add task completion endpoint
✅ fix(balance): correct balance calculation
✅ docs(api): update tasks API documentation
```

---

## 🎨 Breaking Changes

Если коммит содержит breaking changes:

```
feat(api): change tasks endpoint response format

BREAKING CHANGE: The tasks endpoint now returns a different structure

Before:
{
  "data": [...tasks]
}

After:
{
  "tasks": [...tasks],
  "meta": { "total": 10 }
}

Migration guide:
- Update frontend to use response.tasks instead of response.data
- Use response.meta.total for pagination

Refs: #156
```

---

## 🔢 Связь с Issues

### Закрыть issue

```
fix(auth): handle null token

Fixes: #123
Closes: #124
Resolves: #125
```

### Ссылка на issue (не закрывает)

```
feat(tasks): add new feature

Related to #42
Refs: #42
See also: #43
```

### Несколько issues

```
fix(payouts): multiple payout bugs

Fixes: #88, #92, #94
```

---

## 📏 Правила и рекомендации

### Длина строк

- **Summary**: максимум 72 символа
- **Body**: максимум 100 символов на строку
- Разбивайте длинные строки

### Используйте imperative mood (повелительное наклонение)

✅ **Правильно**:
- `add feature`
- `fix bug`
- `update documentation`

❌ **Неправильно**:
- `added feature`
- `fixing bug`
- `updates documentation`

### Начинайте с маленькой буквы

✅ `feat(tasks): add completion tracking`  
❌ `feat(tasks): Add completion tracking`

### Не ставьте точку в конце summary

✅ `fix(auth): handle expired tokens`  
❌ `fix(auth): handle expired tokens.`

### Пустая строка между summary и body

```
feat(tasks): add new endpoint

This adds a new endpoint for completing tasks.
Users can now mark tasks as complete.
```

---

## 🚀 Git Hooks для автоматической проверки

### Установка commitlint

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

### commitlint.config.js

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'auth',
        'users',
        'tasks',
        'payouts',
        'balance',
        'bot',
        'broadcast',
        'buttons',
        'scenarios',
        'settings',
        'stats',
        'messages',
        'media',
        'admin',
        'database',
        'api',
        'tests',
        'ui',
        'pages',
        'store',
        'deps',
        'docker',
        'ci',
        'docs',
        'scripts',
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
  },
};
```

### Husky для commit-msg hook

```bash
npm install --save-dev husky

# Initialize husky
npx husky init

# Add commit-msg hook
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'
```

Теперь некорректные commit messages будут отклоняться автоматически!

---

## 📚 Дополнительные ресурсы

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Angular Commit Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)
- [Commitlint](https://commitlint.js.org/)

---

## 🎓 Шпаргалка (Quick Reference)

```bash
# Новая функциональность
feat(scope): add new feature

# Исправление бага
fix(scope): fix issue with X

# Документация
docs(scope): update documentation

# Рефакторинг
refactor(scope): restructure code

# Тесты
test(scope): add tests for X

# Зависимости
build(deps): upgrade package X

# CI/CD
ci: add deployment workflow

# Обслуживание
chore(scripts): add backup script

# Breaking change
feat(api)!: change response format

BREAKING CHANGE: description
```

---

**Следуйте этим правилам для чистой и понятной истории коммитов!** 🎉

