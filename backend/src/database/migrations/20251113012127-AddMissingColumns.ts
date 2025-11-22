import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingColumns20251113012127 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add media_url to scenarios table if it doesn't exist
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'scenarios' AND column_name = 'media_url'
        ) THEN
          ALTER TABLE scenarios ADD COLUMN media_url VARCHAR;
        END IF;
      END $$;
    `);

    // Add command to tasks table if it doesn't exist
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'tasks' AND column_name = 'command'
        ) THEN
          ALTER TABLE tasks ADD COLUMN command VARCHAR;
        END IF;
      END $$;
    `);

    // Add min_completion_time to tasks table if it doesn't exist
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'tasks' AND column_name = 'min_completion_time'
        ) THEN
          ALTER TABLE tasks ADD COLUMN min_completion_time INTEGER DEFAULT 0;
        END IF;
      END $$;
    `);

    // Remove duplicate is_active column from scenarios (keep only active)
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'scenarios' AND column_name = 'is_active'
        ) THEN
          -- Copy data from is_active to active if active doesn't have the right values
          UPDATE scenarios SET active = is_active WHERE active IS NULL OR active != is_active;
          -- Drop is_active column
          ALTER TABLE scenarios DROP COLUMN is_active;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: Add back is_active column
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'scenarios' AND column_name = 'is_active'
        ) THEN
          ALTER TABLE scenarios ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
          UPDATE scenarios SET is_active = active;
        END IF;
      END $$;
    `);

    // Revert: Remove columns
    await queryRunner.query(`
      ALTER TABLE tasks 
      DROP COLUMN IF EXISTS command,
      DROP COLUMN IF EXISTS min_completion_time;
    `);

    await queryRunner.query(`
      ALTER TABLE scenarios 
      DROP COLUMN IF EXISTS media_url;
    `);
  }
}

