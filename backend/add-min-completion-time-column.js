const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'telegram_bot',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'your_secure_password',
});

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

