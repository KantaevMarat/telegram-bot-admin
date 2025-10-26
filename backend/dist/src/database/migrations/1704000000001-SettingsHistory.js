"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsHistory1704000000001 = void 0;
class SettingsHistory1704000000001 {
    constructor() {
        this.name = 'SettingsHistory1704000000001';
    }
    async up(queryRunner) {
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
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE settings_history`);
    }
}
exports.SettingsHistory1704000000001 = SettingsHistory1704000000001;
//# sourceMappingURL=1704000000001-SettingsHistory.js.map