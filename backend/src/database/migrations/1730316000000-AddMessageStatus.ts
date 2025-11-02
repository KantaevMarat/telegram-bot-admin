import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMessageStatus1730316000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add status column
    await queryRunner.addColumn(
      'messages',
      new TableColumn({
        name: 'status',
        type: 'varchar',
        default: "'sent'",
      }),
    );

    // Add delivered_at column
    await queryRunner.addColumn(
      'messages',
      new TableColumn({
        name: 'delivered_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // Add read_at column
    await queryRunner.addColumn(
      'messages',
      new TableColumn({
        name: 'read_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('messages', 'read_at');
    await queryRunner.dropColumn('messages', 'delivered_at');
    await queryRunner.dropColumn('messages', 'status');
  }
}

