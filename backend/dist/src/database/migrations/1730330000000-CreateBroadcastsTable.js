"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateBroadcastsTable1730330000000 = void 0;
const typeorm_1 = require("typeorm");
class CreateBroadcastsTable1730330000000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'broadcasts',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'text',
                    type: 'text',
                },
                {
                    name: 'media_urls',
                    type: 'jsonb',
                    isNullable: true,
                },
                {
                    name: 'status',
                    type: 'varchar',
                    default: "'draft'",
                },
                {
                    name: 'scheduled_at',
                    type: 'timestamp',
                    isNullable: true,
                },
                {
                    name: 'started_at',
                    type: 'timestamp',
                    isNullable: true,
                },
                {
                    name: 'completed_at',
                    type: 'timestamp',
                    isNullable: true,
                },
                {
                    name: 'total_users',
                    type: 'int',
                    default: 0,
                },
                {
                    name: 'sent_count',
                    type: 'int',
                    default: 0,
                },
                {
                    name: 'failed_count',
                    type: 'int',
                    default: 0,
                },
                {
                    name: 'batch_size',
                    type: 'int',
                    default: 30,
                },
                {
                    name: 'throttle_ms',
                    type: 'int',
                    default: 1000,
                },
                {
                    name: 'created_by_admin_tg_id',
                    type: 'varchar',
                    isNullable: true,
                },
                {
                    name: 'created_at',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'updated_at',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);
        await queryRunner.createIndex('broadcasts', new typeorm_1.TableIndex({
            name: 'IDX_BROADCASTS_STATUS',
            columnNames: ['status'],
        }));
        await queryRunner.createIndex('broadcasts', new typeorm_1.TableIndex({
            name: 'IDX_BROADCASTS_SCHEDULED_AT',
            columnNames: ['scheduled_at'],
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropTable('broadcasts');
    }
}
exports.CreateBroadcastsTable1730330000000 = CreateBroadcastsTable1730330000000;
//# sourceMappingURL=1730330000000-CreateBroadcastsTable.js.map