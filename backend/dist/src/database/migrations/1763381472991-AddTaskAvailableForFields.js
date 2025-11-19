"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddTaskAvailableForFields1763381472991 = void 0;
class AddTaskAvailableForFields1763381472991 {
    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE tasks
            ADD COLUMN IF NOT EXISTS available_for VARCHAR DEFAULT 'all',
            ADD COLUMN IF NOT EXISTS target_ranks TEXT
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE tasks
            DROP COLUMN IF EXISTS available_for,
            DROP COLUMN IF EXISTS target_ranks
        `);
    }
}
exports.AddTaskAvailableForFields1763381472991 = AddTaskAvailableForFields1763381472991;
//# sourceMappingURL=1763381472991-AddTaskAvailableForFields.js.map