import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResponseToScenarios1761432374327 implements MigrationInterface {
  name = 'AddResponseToScenarios1761432374327';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "messages_user_id_fkey"`);
    await queryRunner.query(`ALTER TABLE "payouts" DROP CONSTRAINT "payouts_user_id_fkey"`);
    await queryRunner.query(
      `ALTER TABLE "balance_logs" DROP CONSTRAINT "balance_logs_user_id_fkey"`,
    );
    await queryRunner.query(`ALTER TABLE "user_tasks" DROP CONSTRAINT "user_tasks_user_id_fkey"`);
    await queryRunner.query(`ALTER TABLE "user_tasks" DROP CONSTRAINT "user_tasks_task_id_fkey"`);
    await queryRunner.query(`DROP INDEX "public"."idx_messages_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_messages_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."idx_payouts_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_payouts_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_balance_logs_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_balance_logs_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tasks_active"`);
    await queryRunner.query(`DROP INDEX "public"."idx_user_tasks_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_user_tasks_task_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_tg_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_settings_key"`);
    await queryRunner.query(`DROP INDEX "public"."idx_settings_history_key"`);
    await queryRunner.query(`DROP INDEX "public"."idx_settings_history_admin"`);
    await queryRunner.query(`DROP INDEX "public"."idx_settings_history_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."idx_scenarios_trigger"`);
    await queryRunner.query(`DROP INDEX "public"."idx_scenarios_active"`);
    await queryRunner.query(`DROP INDEX "public"."idx_real_stats_taken_at"`);
    await queryRunner.query(`DROP INDEX "public"."idx_fake_stats_calculated_at"`);
    await queryRunner.query(`DROP INDEX "public"."idx_buttons_active"`);
    await queryRunner.query(`DROP INDEX "public"."idx_admins_tg_id"`);
    await queryRunner.query(
      `ALTER TABLE "user_tasks" DROP CONSTRAINT "user_tasks_user_id_task_id_key"`,
    );
    await queryRunner.query(`ALTER TABLE "scenarios" ADD "response" text`);
    await queryRunner.query(
      `ALTER TABLE "scenarios" ADD "is_active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "is_read" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "created_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "status" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "created_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "updated_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "balance_logs" ALTER COLUMN "created_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "max_per_user" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "cooldown_hours" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "active" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "created_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "updated_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "user_tasks" ALTER COLUMN "status" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "user_tasks" ALTER COLUMN "completed_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "balance_usdt" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "tasks_completed" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "total_earned" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "registered_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "updated_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "settings" ALTER COLUMN "updated_at" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "settings_history" ALTER COLUMN "created_at" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "scenarios" ALTER COLUMN "steps" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "scenarios" ALTER COLUMN "active" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "scenarios" ALTER COLUMN "created_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "scenarios" ALTER COLUMN "updated_at" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "real_stats_snapshots" ALTER COLUMN "users_count" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "real_stats_snapshots" ALTER COLUMN "total_balance" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "real_stats_snapshots" ALTER COLUMN "total_earned" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "real_stats_snapshots" ALTER COLUMN "active_users_24h" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "real_stats_snapshots" ALTER COLUMN "taken_at" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "fake_stats" ALTER COLUMN "online" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "fake_stats" ALTER COLUMN "active" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "fake_stats" ALTER COLUMN "paid_usdt" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "fake_stats" ALTER COLUMN "calculated_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "buttons" ALTER COLUMN "row" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "buttons" ALTER COLUMN "col" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "buttons" ALTER COLUMN "active" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "buttons" ALTER COLUMN "created_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "buttons" ALTER COLUMN "updated_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "admins" ALTER COLUMN "role" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "admins" ALTER COLUMN "created_at" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_830a3c1d92614d1495418c46736" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payouts" ADD CONSTRAINT "FK_5d4cccb2284ac44a2781a832786" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "balance_logs" ADD CONSTRAINT "FK_16cddcf151cdeeb3d28285ef09e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_tasks" ADD CONSTRAINT "FK_da349034af45568bdc0ab493140" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_tasks" ADD CONSTRAINT "FK_67a8a20c2e44bfb84ca1a33e6df" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_tasks" DROP CONSTRAINT "FK_67a8a20c2e44bfb84ca1a33e6df"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_tasks" DROP CONSTRAINT "FK_da349034af45568bdc0ab493140"`,
    );
    await queryRunner.query(
      `ALTER TABLE "balance_logs" DROP CONSTRAINT "FK_16cddcf151cdeeb3d28285ef09e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payouts" DROP CONSTRAINT "FK_5d4cccb2284ac44a2781a832786"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_830a3c1d92614d1495418c46736"`,
    );
    await queryRunner.query(`ALTER TABLE "admins" ALTER COLUMN "created_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "admins" ALTER COLUMN "role" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "buttons" ALTER COLUMN "updated_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "buttons" ALTER COLUMN "created_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "buttons" ALTER COLUMN "active" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "buttons" ALTER COLUMN "col" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "buttons" ALTER COLUMN "row" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "fake_stats" ALTER COLUMN "calculated_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "fake_stats" ALTER COLUMN "paid_usdt" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "fake_stats" ALTER COLUMN "active" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "fake_stats" ALTER COLUMN "online" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "real_stats_snapshots" ALTER COLUMN "taken_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "real_stats_snapshots" ALTER COLUMN "active_users_24h" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "real_stats_snapshots" ALTER COLUMN "total_earned" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "real_stats_snapshots" ALTER COLUMN "total_balance" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "real_stats_snapshots" ALTER COLUMN "users_count" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "scenarios" ALTER COLUMN "updated_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "scenarios" ALTER COLUMN "created_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "scenarios" ALTER COLUMN "active" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "scenarios" ALTER COLUMN "steps" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "settings_history" ALTER COLUMN "created_at" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "settings" ALTER COLUMN "updated_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "updated_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "registered_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "total_earned" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "tasks_completed" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "balance_usdt" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "user_tasks" ALTER COLUMN "completed_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "user_tasks" ALTER COLUMN "status" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "updated_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "created_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "active" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "cooldown_hours" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "max_per_user" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "balance_logs" ALTER COLUMN "created_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "updated_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "created_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "status" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "created_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "is_read" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "scenarios" DROP COLUMN "is_active"`);
    await queryRunner.query(`ALTER TABLE "scenarios" DROP COLUMN "response"`);
    await queryRunner.query(
      `ALTER TABLE "user_tasks" ADD CONSTRAINT "user_tasks_user_id_task_id_key" UNIQUE ("user_id", "task_id")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_admins_tg_id" ON "admins" ("tg_id") `);
    await queryRunner.query(`CREATE INDEX "idx_buttons_active" ON "buttons" ("active") `);
    await queryRunner.query(
      `CREATE INDEX "idx_fake_stats_calculated_at" ON "fake_stats" ("calculated_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_real_stats_taken_at" ON "real_stats_snapshots" ("taken_at") `,
    );
    await queryRunner.query(`CREATE INDEX "idx_scenarios_active" ON "scenarios" ("active") `);
    await queryRunner.query(`CREATE INDEX "idx_scenarios_trigger" ON "scenarios" ("trigger") `);
    await queryRunner.query(
      `CREATE INDEX "idx_settings_history_created_at" ON "settings_history" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_settings_history_admin" ON "settings_history" ("admin_tg_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_settings_history_key" ON "settings_history" ("setting_key") `,
    );
    await queryRunner.query(`CREATE INDEX "idx_settings_key" ON "settings" ("key") `);
    await queryRunner.query(`CREATE INDEX "idx_users_status" ON "users" ("status") `);
    await queryRunner.query(`CREATE INDEX "idx_users_tg_id" ON "users" ("tg_id") `);
    await queryRunner.query(`CREATE INDEX "idx_user_tasks_task_id" ON "user_tasks" ("task_id") `);
    await queryRunner.query(`CREATE INDEX "idx_user_tasks_user_id" ON "user_tasks" ("user_id") `);
    await queryRunner.query(`CREATE INDEX "idx_tasks_active" ON "tasks" ("active") `);
    await queryRunner.query(
      `CREATE INDEX "idx_balance_logs_created_at" ON "balance_logs" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_balance_logs_user_id" ON "balance_logs" ("user_id") `,
    );
    await queryRunner.query(`CREATE INDEX "idx_payouts_status" ON "payouts" ("status") `);
    await queryRunner.query(`CREATE INDEX "idx_payouts_user_id" ON "payouts" ("user_id") `);
    await queryRunner.query(`CREATE INDEX "idx_messages_created_at" ON "messages" ("created_at") `);
    await queryRunner.query(`CREATE INDEX "idx_messages_user_id" ON "messages" ("user_id") `);
    await queryRunner.query(
      `ALTER TABLE "user_tasks" ADD CONSTRAINT "user_tasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_tasks" ADD CONSTRAINT "user_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "balance_logs" ADD CONSTRAINT "balance_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payouts" ADD CONSTRAINT "payouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
