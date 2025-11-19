"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const config_1 = require("@nestjs/config");
const configService = new config_1.ConfigService();
const dbUrl = process.env.DATABASE_URL;
exports.default = new typeorm_1.DataSource(dbUrl
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
    });
//# sourceMappingURL=data-source.js.map