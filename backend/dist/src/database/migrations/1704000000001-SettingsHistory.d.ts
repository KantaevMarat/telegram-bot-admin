import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class SettingsHistory1704000000001 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
