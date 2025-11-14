"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MakeButtonFieldsOptional1763067781066 = void 0;
class MakeButtonFieldsOptional1763067781066 {
    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE "buttons" 
            ALTER COLUMN "label" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "buttons" 
            ALTER COLUMN "action_payload" DROP NOT NULL
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE "buttons" 
            ALTER COLUMN "label" SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "buttons" 
            ALTER COLUMN "action_payload" SET NOT NULL
        `);
    }
}
exports.MakeButtonFieldsOptional1763067781066 = MakeButtonFieldsOptional1763067781066;
//# sourceMappingURL=1763067781066-MakeButtonFieldsOptional.js.map