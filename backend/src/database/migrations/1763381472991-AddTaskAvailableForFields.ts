import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaskAvailableForFields1763381472991 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add available_for and target_ranks columns to tasks table
        await queryRunner.query(`
            ALTER TABLE tasks
            ADD COLUMN IF NOT EXISTS available_for VARCHAR DEFAULT 'all',
            ADD COLUMN IF NOT EXISTS target_ranks TEXT
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove available_for and target_ranks columns from tasks table
        await queryRunner.query(`
            ALTER TABLE tasks
            DROP COLUMN IF EXISTS available_for,
            DROP COLUMN IF EXISTS target_ranks
        `);
    }

}
