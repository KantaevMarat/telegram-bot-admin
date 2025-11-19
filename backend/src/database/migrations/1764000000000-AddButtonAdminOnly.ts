import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddButtonAdminOnly1764000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE buttons
      ADD COLUMN IF NOT EXISTS admin_only BOOLEAN DEFAULT FALSE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE buttons
      DROP COLUMN IF EXISTS admin_only;
    `);
  }
}

