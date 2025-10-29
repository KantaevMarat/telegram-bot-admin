"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataSourceOptions = exports.typeOrmConfig = void 0;
const typeorm_1 = require("typeorm");
const typeOrmConfig = (configService) => {
    const dbUrl = configService.get('DATABASE_URL') || 'postgresql://postgres:postgres@postgres:5432/tg_app';
    console.log('🔍 TypeORM connecting to:', dbUrl);
    return {
        type: 'postgres',
        url: dbUrl,
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
        synchronize: false,
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
    };
};
exports.typeOrmConfig = typeOrmConfig;
exports.dataSourceOptions = {
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/tg_app',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
};
const dataSource = new typeorm_1.DataSource(exports.dataSourceOptions);
exports.default = dataSource;
//# sourceMappingURL=typeorm.config.js.map