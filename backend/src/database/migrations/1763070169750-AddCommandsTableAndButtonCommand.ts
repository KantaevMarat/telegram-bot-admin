import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCommandsTableAndButtonCommand1763070169750 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create commands table
        await queryRunner.query(`
            CREATE TABLE "commands" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "name" varchar UNIQUE NOT NULL,
                "description" text NOT NULL,
                "response" text NOT NULL,
                "media_url" varchar,
                "active" boolean DEFAULT true,
                "created_at" timestamp DEFAULT now(),
                "updated_at" timestamp DEFAULT now()
            )
        `);

        // Add command column to buttons table if not exists
        await queryRunner.query(`
            ALTER TABLE "buttons" 
            ADD COLUMN IF NOT EXISTS "command" varchar
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "buttons" 
            DROP COLUMN IF EXISTS "command"
        `);
        
        await queryRunner.query(`DROP TABLE "commands"`);
    }

}
