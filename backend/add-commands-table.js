const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

async function addCommandsTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if table exists
    const checkQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'commands'
      );
    `;
    const result = await client.query(checkQuery);

    if (result.rows[0].exists) {
      console.log('✅ Table "commands" already exists');
      return;
    }

    // Create commands table
    await client.query(`
      CREATE TABLE commands (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL UNIQUE,
        description TEXT NOT NULL,
        response TEXT NOT NULL,
        media_url VARCHAR NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Table "commands" created successfully');
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addCommandsTable()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

