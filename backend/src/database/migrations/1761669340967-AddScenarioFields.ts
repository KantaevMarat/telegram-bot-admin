import { MigrationInterface, QueryRunner } from "typeorm";

export class AddScenarioFields1761669340967 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add missing fields to scenarios table
        await queryRunner.query(`
            ALTER TABLE scenarios
            ADD COLUMN response TEXT,
            ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
            ALTER COLUMN steps DROP NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove added fields from scenarios table
        await queryRunner.query(`
            ALTER TABLE scenarios
            DROP COLUMN response,
            DROP COLUMN is_active,
            ALTER COLUMN steps SET NOT NULL
        `);
    }

}

