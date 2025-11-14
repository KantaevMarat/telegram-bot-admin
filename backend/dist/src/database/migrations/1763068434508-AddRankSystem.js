"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddRankSystem1763068434508 = void 0;
class AddRankSystem1763068434508 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TYPE rank_level AS ENUM ('stone', 'bronze', 'silver', 'gold', 'platinum')
        `);
        await queryRunner.query(`
            CREATE TYPE payment_method AS ENUM ('usd_balance', 'rub_requisites', 'uah_requisites')
        `);
        await queryRunner.query(`
            CREATE TYPE request_status AS ENUM ('new', 'in_progress', 'requisites_sent', 'payment_confirmed', 'completed', 'cancelled')
        `);
        await queryRunner.query(`
            CREATE TABLE "rank_settings" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "bronze_requires_channels" boolean DEFAULT true,
                "silver_required_tasks" integer DEFAULT 10,
                "silver_required_referrals" integer DEFAULT 1,
                "gold_required_tasks" integer DEFAULT 50,
                "gold_required_referrals" integer DEFAULT 3,
                "platinum_price_usd" decimal(10,2) DEFAULT 500,
                "platinum_price_rub" decimal(10,2) DEFAULT 500,
                "platinum_price_uah" decimal(10,2) DEFAULT 250,
                "platinum_duration_days" integer DEFAULT 30,
                "stone_bonus" decimal(5,2) DEFAULT 0,
                "bronze_bonus" decimal(5,2) DEFAULT 3,
                "silver_bonus" decimal(5,2) DEFAULT 7,
                "gold_bonus" decimal(5,2) DEFAULT 12,
                "platinum_bonus" decimal(5,2) DEFAULT 20,
                "notification_80_percent" text,
                "notification_gold_achieved" text,
                "notification_weekly_reminder" text,
                "notification_expiry_warning" text,
                "premium_info_message" text,
                "manager_username" text,
                "created_at" timestamp DEFAULT now(),
                "updated_at" timestamp DEFAULT now()
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "user_ranks" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "user_id" uuid UNIQUE NOT NULL,
                "current_rank" rank_level DEFAULT 'stone',
                "tasks_completed" integer DEFAULT 0,
                "referrals_count" integer DEFAULT 0,
                "channels_subscribed" boolean DEFAULT false,
                "bonus_percentage" decimal(5,2) DEFAULT 0,
                "platinum_expires_at" timestamp,
                "platinum_active" boolean DEFAULT false,
                "last_notification_sent" timestamp,
                "notified_80_percent" boolean DEFAULT false,
                "notified_gold_achieved" boolean DEFAULT false,
                "created_at" timestamp DEFAULT now(),
                "updated_at" timestamp DEFAULT now(),
                CONSTRAINT "fk_user_ranks_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "premium_requests" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "request_number" varchar UNIQUE NOT NULL,
                "user_id" uuid NOT NULL,
                "payment_method" payment_method NOT NULL,
                "amount" decimal(10,2) NOT NULL,
                "currency" varchar(10) NOT NULL,
                "status" request_status DEFAULT 'new',
                "admin_notes" text,
                "processed_by_admin" bigint,
                "requisites_sent_at" timestamp,
                "payment_confirmed_at" timestamp,
                "completed_at" timestamp,
                "created_at" timestamp DEFAULT now(),
                "updated_at" timestamp DEFAULT now(),
                CONSTRAINT "fk_premium_requests_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`
            INSERT INTO "rank_settings" (
                "notification_80_percent",
                "notification_gold_achieved",
                "notification_weekly_reminder",
                "notification_expiry_warning",
                "premium_info_message",
                "manager_username"
            ) VALUES (
                'Ты близок к Золотому уровню! Он откроет доступ к Платиновой подписке с бонусом +20% и эксклюзивными заданиями',
                '🎉 Поздравляем с выходом на Золотой уровень! Теперь доступна Платиновая подписка. Узнать подробности: !premium_info',
                'Напомним о преимуществах Платины: +20% бонус, личный менеджер, VIP-задания. Команда !premium_info',
                'Твоя Платиновая подписка истекает через 3 дня. Продли, чтобы сохранить преимущества. Используй !upgrade для продления',
                '🏆 ПЛАТИНОВАЯ ПОДПИСКА',
                'support_manager'
            )
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "premium_requests"`);
        await queryRunner.query(`DROP TABLE "user_ranks"`);
        await queryRunner.query(`DROP TABLE "rank_settings"`);
        await queryRunner.query(`DROP TYPE request_status`);
        await queryRunner.query(`DROP TYPE payment_method`);
        await queryRunner.query(`DROP TYPE rank_level`);
    }
}
exports.AddRankSystem1763068434508 = AddRankSystem1763068434508;
//# sourceMappingURL=1763068434508-AddRankSystem.js.map