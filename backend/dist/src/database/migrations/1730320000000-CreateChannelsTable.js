"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateChannelsTable1730320000000 = void 0;
const typeorm_1 = require("typeorm");
class CreateChannelsTable1730320000000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'channels',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'channel_id',
                    type: 'varchar',
                    length: '255',
                    isUnique: true,
                },
                {
                    name: 'title',
                    type: 'varchar',
                    length: '255',
                },
                {
                    name: 'username',
                    type: 'varchar',
                    length: '255',
                    isNullable: true,
                },
                {
                    name: 'url',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'is_active',
                    type: 'boolean',
                    default: true,
                },
                {
                    name: 'order',
                    type: 'int',
                    default: 0,
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
        await queryRunner.createIndex('channels', new typeorm_1.TableIndex({
            name: 'IDX_CHANNELS_IS_ACTIVE',
            columnNames: ['is_active'],
        }));
        await queryRunner.createIndex('channels', new typeorm_1.TableIndex({
            name: 'IDX_CHANNELS_ORDER',
            columnNames: ['order'],
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropTable('channels');
    }
}
exports.CreateChannelsTable1730320000000 = CreateChannelsTable1730320000000;
//# sourceMappingURL=1730320000000-CreateChannelsTable.js.map