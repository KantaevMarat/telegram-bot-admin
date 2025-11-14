import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddMissingColumns20251113012127 implements MigrationInterface {
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
