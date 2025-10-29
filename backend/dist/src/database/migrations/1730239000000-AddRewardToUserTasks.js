"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddRewardToUserTasks1730239000000 = void 0;
const typeorm_1 = require("typeorm");
class AddRewardToUserTasks1730239000000 {
    async up(queryRunner) {
        const table = await queryRunner.getTable('user_tasks');
        if (table && !table.findColumnByName('reward')) {
            await queryRunner.addColumn('user_tasks', new typeorm_1.TableColumn({
                name: 'reward',
                type: 'decimal',
                precision: 10,
                scale: 2,
                isNullable: true,
            }));
        }
        if (table && !table.findColumnByName('reward_received')) {
            await queryRunner.addColumn('user_tasks', new typeorm_1.TableColumn({
                name: 'reward_received',
                type: 'decimal',
                precision: 10,
                scale: 2,
                isNullable: true,
            }));
        }
        if (table && !table.findColumnByName('started_at')) {
            await queryRunner.addColumn('user_tasks', new typeorm_1.TableColumn({
                name: 'started_at',
                type: 'timestamp',
                isNullable: true,
            }));
        }
        if (table && !table.findColumnByName('submitted_at')) {
            await queryRunner.addColumn('user_tasks', new typeorm_1.TableColumn({
                name: 'submitted_at',
                type: 'timestamp',
                isNullable: true,
            }));
        }
        if (table && !table.findColumnByName('completed_at')) {
            await queryRunner.addColumn('user_tasks', new typeorm_1.TableColumn({
                name: 'completed_at',
                type: 'timestamp',
                isNullable: true,
            }));
        }
        if (table && !table.findColumnByName('created_at')) {
            await queryRunner.addColumn('user_tasks', new typeorm_1.TableColumn({
                name: 'created_at',
                type: 'timestamp',
                default: 'CURRENT_TIMESTAMP',
                isNullable: false,
            }));
        }
    }
    async down(queryRunner) {
        await queryRunner.dropColumn('user_tasks', 'reward');
        await queryRunner.dropColumn('user_tasks', 'reward_received');
        await queryRunner.dropColumn('user_tasks', 'started_at');
        await queryRunner.dropColumn('user_tasks', 'submitted_at');
        await queryRunner.dropColumn('user_tasks', 'completed_at');
    }
}
exports.AddRewardToUserTasks1730239000000 = AddRewardToUserTasks1730239000000;
//# sourceMappingURL=1730239000000-AddRewardToUserTasks.js.map