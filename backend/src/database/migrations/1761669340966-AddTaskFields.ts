import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaskFields1761669340966 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add channel_id and task_type columns to tasks table
        await queryRunner.query(`
            ALTER TABLE tasks
            ADD COLUMN channel_id VARCHAR,
            ADD COLUMN task_type VARCHAR DEFAULT 'subscription'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove channel_id and task_type columns from tasks table
        await queryRunner.query(`
            ALTER TABLE tasks
            DROP COLUMN channel_id,
            DROP COLUMN task_type
        `);
    }

}
