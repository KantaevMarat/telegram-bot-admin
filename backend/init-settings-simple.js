// Simple script to initialize settings from compiled code
const { DataSource } = require('typeorm');

// Database config from environment
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'telegram_bot',
  entities: ['dist/src/entities/**/*.js'],
  synchronize: false,
});

async function run() {
  try {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Connected!');

    // Import the init function
    const { initializeSettings } = require('./dist/src/database/init-settings');
    
    console.log('🔧 Initializing settings...');
    await initializeSettings(dataSource);
    
    console.log('🎉 Settings initialized successfully!');
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await dataSource.destroy();
    process.exit(1);
  }
}

run();

