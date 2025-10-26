import { MigrationInterface, QueryRunner } from "typeorm";
export declare class UpdateUserTasksEntity1761484052180 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
