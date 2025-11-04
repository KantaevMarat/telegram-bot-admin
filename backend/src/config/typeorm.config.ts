import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';

export const typeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const dbUrl = configService.get('DATABASE_URL');
  console.log('🔍 TypeORM connecting to:', dbUrl || 'using individual config');
  
  if (dbUrl) {
    return {
      type: 'postgres',
      url: dbUrl,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
      synchronize: false,
      logging: configService.get('NODE_ENV') === 'development',
      ssl: configService.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
    };
  }
  
  return {
    type: 'postgres',
    host: configService.get('DB_HOST', 'postgres'),
    port: parseInt(configService.get('DB_PORT', '5432')),
    username: configService.get('DB_USER', 'telegram_bot_user'),
    password: configService.get('DB_PASSWORD', 'password'),
    database: configService.get('DB_NAME', 'telegram_bot_db'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: configService.get('NODE_ENV') === 'development',
    ssl: configService.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
  };
};

// For TypeORM CLI
const dbUrl = process.env.DATABASE_URL;
export const dataSourceOptions: DataSourceOptions = dbUrl ? {
  type: 'postgres',
  url: dbUrl,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
} : {
  type: 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'telegram_bot_user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'telegram_bot_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
