const { DataSource } = require('typeorm');
require('dotenv').config();

async function addCommandColumn() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    await dataSource.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS command VARCHAR(255)');
    console.log('✅ Column command added to tasks table');

    await dataSource.destroy();
    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addCommandColumn();



