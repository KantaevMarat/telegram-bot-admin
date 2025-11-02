"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddMessageStatus1730316000000 = void 0;
const typeorm_1 = require("typeorm");
class AddMessageStatus1730316000000 {
    async up(queryRunner) {
        await queryRunner.addColumn('messages', new typeorm_1.TableColumn({
            name: 'status',
            type: 'varchar',
            default: "'sent'",
        }));
        await queryRunner.addColumn('messages', new typeorm_1.TableColumn({
            name: 'delivered_at',
            type: 'timestamp',
            isNullable: true,
        }));
        await queryRunner.addColumn('messages', new typeorm_1.TableColumn({
            name: 'read_at',
            type: 'timestamp',
            isNullable: true,
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropColumn('messages', 'read_at');
        await queryRunner.dropColumn('messages', 'delivered_at');
        await queryRunner.dropColumn('messages', 'status');
    }
}
exports.AddMessageStatus1730316000000 = AddMessageStatus1730316000000;
//# sourceMappingURL=1730316000000-AddMessageStatus.js.map