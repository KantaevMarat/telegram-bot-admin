"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddButtonAdminOnly1764000000000 = void 0;
class AddButtonAdminOnly1764000000000 {
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE buttons
      ADD COLUMN IF NOT EXISTS admin_only BOOLEAN DEFAULT FALSE;
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE buttons
      DROP COLUMN IF EXISTS admin_only;
    `);
    }
}
exports.AddButtonAdminOnly1764000000000 = AddButtonAdminOnly1764000000000;
//# sourceMappingURL=1764000000000-AddButtonAdminOnly.js.map