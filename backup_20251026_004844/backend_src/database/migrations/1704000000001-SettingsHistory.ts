import { MigrationInterface, QueryRunner } from 'typeorm';

export class SettingsHistory1704000000001 implements MigrationInterface {
  name = 'SettingsHistory1704000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE settings_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        setting_key VARCHAR NOT NULL,
        old_value TEXT,
        new_value TEXT NOT NULL,
        change_reason VARCHAR,
        admin_tg_id BIGINT,
        admin_username VARCHAR,
        admin_first_name VARCHAR,
        ip_address VARCHAR,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX idx_settings_history_key ON settings_history(setting_key);
      CREATE INDEX idx_settings_history_admin ON settings_history(admin_tg_id);
      CREATE INDEX idx_settings_history_created_at ON settings_history(created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE settings_history`);
  }
}
