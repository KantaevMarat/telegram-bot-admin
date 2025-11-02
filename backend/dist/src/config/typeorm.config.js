"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataSourceOptions = exports.typeOrmConfig = void 0;
const typeorm_1 = require("typeorm");
const typeOrmConfig = (configService) => {
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
exports.typeOrmConfig = typeOrmConfig;
const dbUrl = process.env.DATABASE_URL;
exports.dataSourceOptions = dbUrl ? {
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
const dataSource = new typeorm_1.DataSource(exports.dataSourceOptions);
exports.default = dataSource;
//# sourceMappingURL=typeorm.config.js.map