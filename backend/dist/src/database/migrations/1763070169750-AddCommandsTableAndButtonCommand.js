"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddCommandsTableAndButtonCommand1763070169750 = void 0;
class AddCommandsTableAndButtonCommand1763070169750 {
    async up(queryRunner) {
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
        await queryRunner.query(`
            ALTER TABLE "buttons" 
            ADD COLUMN IF NOT EXISTS "command" varchar
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE "buttons" 
            DROP COLUMN IF EXISTS "command"
        `);
        await queryRunner.query(`DROP TABLE "commands"`);
    }
}
exports.AddCommandsTableAndButtonCommand1763070169750 = AddCommandsTableAndButtonCommand1763070169750;
//# sourceMappingURL=1763070169750-AddCommandsTableAndButtonCommand.js.map