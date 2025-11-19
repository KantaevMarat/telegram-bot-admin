import { DataSource } from 'typeorm';
import { typeOrmConfig } from './config/typeorm.config';
import { ConfigService } from '@nestjs/config';

// Create a minimal ConfigService for DataSource
const configService = new ConfigService();
const dbUrl = process.env.DATABASE_URL;

export default new DataSource(
  dbUrl
    ? {
        type: 'postgres',
        url: dbUrl,
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
        synchronize: false,
      }
    : {
        type: 'postgres',
        host: process.env.DB_HOST || 'postgres',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'postgres',
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
        synchronize: false,
      },
);

