"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddScenarioFields1761669340967 = void 0;
class AddScenarioFields1761669340967 {
    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE scenarios
            ADD COLUMN response TEXT,
            ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
            ALTER COLUMN steps DROP NOT NULL
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE scenarios
            DROP COLUMN response,
            DROP COLUMN is_active,
            ALTER COLUMN steps SET NOT NULL
        `);
    }
}
exports.AddScenarioFields1761669340967 = AddScenarioFields1761669340967;
//# sourceMappingURL=1761669340967-AddScenarioFields.js.map