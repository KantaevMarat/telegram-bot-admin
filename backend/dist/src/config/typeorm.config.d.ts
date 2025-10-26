import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
export declare const typeOrmConfig: (configService: ConfigService) => TypeOrmModuleOptions;
export declare const dataSourceOptions: DataSourceOptions;
declare const dataSource: DataSource;
export default dataSource;
