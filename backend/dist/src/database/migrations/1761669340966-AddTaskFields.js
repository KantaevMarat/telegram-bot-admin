"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddTaskFields1761669340966 = void 0;
class AddTaskFields1761669340966 {
    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE tasks
            ADD COLUMN channel_id VARCHAR,
            ADD COLUMN task_type VARCHAR DEFAULT 'subscription'
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE tasks
            DROP COLUMN channel_id,
            DROP COLUMN task_type
        `);
    }
}
exports.AddTaskFields1761669340966 = AddTaskFields1761669340966;
//# sourceMappingURL=1761669340966-AddTaskFields.js.map