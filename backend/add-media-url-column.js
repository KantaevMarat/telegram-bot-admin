const { DataSource } = require('typeorm');
require('dotenv').config();

async function addMediaUrlColumn() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    await dataSource.query('ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS media_url VARCHAR(255)');
    console.log('✅ Column media_url added to scenarios table');

    await dataSource.destroy();
    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addMediaUrlColumn();



