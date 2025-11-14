import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeButtonFieldsOptional1763067781066 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Make label nullable
        await queryRunner.query(`
            ALTER TABLE "buttons" 
            ALTER COLUMN "label" DROP NOT NULL
        `);

        // Make action_payload nullable
        await queryRunner.query(`
            ALTER TABLE "buttons" 
            ALTER COLUMN "action_payload" DROP NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert label to NOT NULL
        await queryRunner.query(`
            ALTER TABLE "buttons" 
            ALTER COLUMN "label" SET NOT NULL
        `);

        // Revert action_payload to NOT NULL
        await queryRunner.query(`
            ALTER TABLE "buttons" 
            ALTER COLUMN "action_payload" SET NOT NULL
        `);
    }

}
