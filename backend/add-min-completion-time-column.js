const { Client } = require('pg');
const url = require('url');

// Поддержка DATABASE_URL (приоритет) или отдельных переменных
let clientConfig;

if (process.env.DATABASE_URL) {
  // Используем DATABASE_URL (формат: postgresql://user:password@host:port/database)
  const dbUrl = process.env.DATABASE_URL;
  const dbConfig = url.parse(dbUrl);
  
  clientConfig = {
    host: dbConfig.hostname,
    port: dbConfig.port || 5432,
    database: dbConfig.pathname ? dbConfig.pathname.slice(1) : 'telegram_bot',
    user: dbConfig.auth ? dbConfig.auth.split(':')[0] : 'postgres',
    password: dbConfig.auth ? dbConfig.auth.split(':')[1] : '',
  };
} else {
  // Используем отдельные переменные окружения
  clientConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'telegram_bot',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'your_secure_password',
  };
}

const client = new Client(clientConfig);

async function addMinCompletionTimeColumn() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if column exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'min_completion_time'
    `);

    if (checkResult.rows.length > 0) {
      console.log('ℹ️  Column min_completion_time already exists');
      return;
    }

    // Add column
    await client.query(`
      ALTER TABLE tasks 
      ADD COLUMN min_completion_time INTEGER DEFAULT 0
    `);

    console.log('✅ Column min_completion_time added successfully');
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addMinCompletionTimeColumn();

