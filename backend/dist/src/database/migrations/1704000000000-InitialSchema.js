"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialSchema1704000000000 = void 0;
class InitialSchema1704000000000 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tg_id BIGINT UNIQUE NOT NULL,
        username VARCHAR,
        first_name VARCHAR,
        last_name VARCHAR,
        balance_usdt DECIMAL(10, 2) DEFAULT 0,
        tasks_completed INTEGER DEFAULT 0,
        total_earned DECIMAL(10, 2) DEFAULT 0,
        status VARCHAR DEFAULT 'active',
        referral_code VARCHAR,
        referred_by UUID,
        registered_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX idx_users_tg_id ON users(tg_id);
      CREATE INDEX idx_users_status ON users(status);
    `);
        await queryRunner.query(`
      CREATE TABLE admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tg_id BIGINT UNIQUE NOT NULL,
        role VARCHAR DEFAULT 'admin',
        username VARCHAR,
        first_name VARCHAR,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX idx_admins_tg_id ON admins(tg_id);
    `);
        await queryRunner.query(`
      CREATE TABLE fake_stats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        online INTEGER DEFAULT 0,
        active INTEGER DEFAULT 0,
        paid_usdt DECIMAL(12, 2) DEFAULT 0,
        calculated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX idx_fake_stats_calculated_at ON fake_stats(calculated_at DESC);
    `);
        await queryRunner.query(`
      CREATE TABLE real_stats_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        users_count INTEGER DEFAULT 0,
        total_balance DECIMAL(12, 2) DEFAULT 0,
        total_earned DECIMAL(12, 2) DEFAULT 0,
        active_users_24h INTEGER DEFAULT 0,
        taken_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX idx_real_stats_taken_at ON real_stats_snapshots(taken_at DESC);
    `);
        await queryRunner.query(`
      CREATE TABLE payouts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        method VARCHAR NOT NULL,
        method_details TEXT,
        status VARCHAR DEFAULT 'pending',
        reason_if_declined TEXT,
        processed_by_admin_tg_id BIGINT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX idx_payouts_user_id ON payouts(user_id);
      CREATE INDEX idx_payouts_status ON payouts(status);
    `);
        await queryRunner.query(`
      CREATE TABLE messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        from_admin_tg_id BIGINT,
        text TEXT NOT NULL,
        media_url TEXT,
        media_type VARCHAR,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX idx_messages_user_id ON messages(user_id);
      CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
    `);
        await queryRunner.query(`
      CREATE TABLE buttons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        label VARCHAR NOT NULL,
        action_type VARCHAR NOT NULL,
        action_payload JSONB NOT NULL,
        row INTEGER DEFAULT 0,
        col INTEGER DEFAULT 0,
        media_url TEXT,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX idx_buttons_active ON buttons(active);
    `);
        await queryRunner.query(`
      CREATE TABLE scenarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        trigger VARCHAR NOT NULL,
        steps JSONB NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX idx_scenarios_trigger ON scenarios(trigger);
      CREATE INDEX idx_scenarios_active ON scenarios(active);
    `);
        await queryRunner.query(`
      CREATE TABLE tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR NOT NULL,
        description TEXT NOT NULL,
        reward_min DECIMAL(10, 2) NOT NULL,
        reward_max DECIMAL(10, 2) NOT NULL,
        media_url TEXT,
        media_type VARCHAR,
        max_per_user INTEGER DEFAULT 1,
        action_url VARCHAR,
        cooldown_hours INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX idx_tasks_active ON tasks(active);
    `);
        await queryRunner.query(`
      CREATE TABLE user_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        reward_received DECIMAL(10, 2) NOT NULL,
        status VARCHAR DEFAULT 'completed',
        completed_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, task_id)
      );
      CREATE INDEX idx_user_tasks_user_id ON user_tasks(user_id);
      CREATE INDEX idx_user_tasks_task_id ON user_tasks(task_id);
    `);
        await queryRunner.query(`
      CREATE TABLE balance_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        admin_tg_id BIGINT,
        delta DECIMAL(10, 2) NOT NULL,
        balance_before DECIMAL(10, 2) NOT NULL,
        balance_after DECIMAL(10, 2) NOT NULL,
        reason VARCHAR NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX idx_balance_logs_user_id ON balance_logs(user_id);
      CREATE INDEX idx_balance_logs_created_at ON balance_logs(created_at DESC);
    `);
        await queryRunner.query(`
      CREATE TABLE settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description VARCHAR,
        updated_by_admin_tg_id BIGINT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX idx_settings_key ON settings(key);
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS balance_logs CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS user_tasks CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS tasks CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS scenarios CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS buttons CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS messages CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS payouts CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS settings CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS real_stats_snapshots CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS fake_stats CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS admins CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE`);
    }
}
exports.InitialSchema1704000000000 = InitialSchema1704000000000;
//# sourceMappingURL=1704000000000-InitialSchema.js.map