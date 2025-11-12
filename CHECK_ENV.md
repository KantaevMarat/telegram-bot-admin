# 🔍 Проверка .env файла для SSL

## Команды для диагностики на сервере:

### 1. Проверить что LETSENCRYPT_EMAIL установлен:

```bash
cat .env | grep LETSENCRYPT_EMAIL
```

### 2. Проверить формат (без пробелов вокруг =):

```bash
# ПРАВИЛЬНО:
LETSENCRYPT_EMAIL=admin@marranasuete.ru

# НЕПРАВИЛЬНО (с пробелами):
LETSENCRYPT_EMAIL = admin@marranasuete.ru
LETSENCRYPT_EMAIL= admin@marranasuete.ru
```

### 3. Проверить что переменная загружается:

```bash
source .env
echo $LETSENCRYPT_EMAIL
```

### 4. Если не загружается, добавьте вручную:

```bash
nano .env
```

Добавьте строку (БЕЗ пробелов):
```
LETSENCRYPT_EMAIL=admin@marranasuete.ru
```

Сохранить: `Ctrl+X`, `Y`, `Enter`

### 5. Проверить снова:

```bash
./setup-ssl.sh
```

