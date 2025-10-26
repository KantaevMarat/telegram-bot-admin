import { MigrationInterface, QueryRunner } from "typeorm";
export declare class AddResponseToScenarios1761432374327 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
