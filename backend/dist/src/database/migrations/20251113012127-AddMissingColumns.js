"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddMissingColumns20251113012127 = void 0;
class AddMissingColumns20251113012127 {
    async up(queryRunner) {
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
    async down(queryRunner) {
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
exports.AddMissingColumns20251113012127 = AddMissingColumns20251113012127;
//# sourceMappingURL=20251113012127-AddMissingColumns.js.map