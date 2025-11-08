const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

async function addCommandColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if column exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'buttons' AND column_name = 'command';
    `;
    const result = await client.query(checkQuery);

    if (result.rows.length > 0) {
      console.log('✅ Column "command" already exists in "buttons" table');
      return;
    }

    // Add command column
    await client.query(`
      ALTER TABLE buttons 
      ADD COLUMN command VARCHAR NULL;
    `);

    console.log('✅ Column "command" added to "buttons" table');
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addCommandColumn()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

