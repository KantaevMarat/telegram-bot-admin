# Database Migration Instructions

## Problem
The backend is running but the database tables don't exist yet, causing errors like:
- `relation "users" does not exist`
- `relation "broadcasts" does not exist`

## Solution
Run the database migrations to create all tables.

## Steps

### Option 1: Run migrations inside Docker container

```bash
# Connect to your server first
# Then run:

cd ~/telegram-bot-admin

# Run migrations
docker compose -f docker-compose.lightweight.yml exec backend npm run migration:run
```

### Option 2: If the above doesn't work, run directly with TypeORM CLI

```bash
cd ~/telegram-bot-admin

# Enter the container
docker compose -f docker-compose.lightweight.yml exec backend sh

# Inside the container, run:
cd /app
node dist/src/data-source.js
# Or try:
npx typeorm migration:run -d dist/src/data-source.js
```

### Option 3: One-line command

```bash
docker compose -f docker-compose.lightweight.yml exec backend npx typeorm migration:run -d dist/src/data-source.js
```

## Verify

After running migrations, check the logs:
```bash
docker compose -f docker-compose.lightweight.yml logs backend
```

You should see messages about migrations being executed, and the bot should start working without "relation does not exist" errors.

## What the migrations will create

The migrations will create these tables:
- users
- admins
- settings
- settings_history
- channels
- buttons
- scenarios
- tasks
- user_tasks
- payouts
- balance_logs
- broadcasts
- messages
- fake_stats

## If migrations fail

If you see errors about migrations already being executed or tables already existing, you might need to either:
1. Reset the database (if it's safe to do so)
2. Or manually create the missing tables

Let me know if you encounter any errors and I can help troubleshoot!

