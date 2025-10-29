import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRewardToUserTasks1730239000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if columns exist before adding
    const table = await queryRunner.getTable('user_tasks');
    
    if (table && !table.findColumnByName('reward')) {
      await queryRunner.addColumn(
        'user_tasks',
        new TableColumn({
          name: 'reward',
          type: 'decimal',
          precision: 10,
          scale: 2,
          isNullable: true,
        }),
      );
    }

    if (table && !table.findColumnByName('reward_received')) {
      await queryRunner.addColumn(
        'user_tasks',
        new TableColumn({
          name: 'reward_received',
          type: 'decimal',
          precision: 10,
          scale: 2,
          isNullable: true,
        }),
      );
    }

    if (table && !table.findColumnByName('started_at')) {
      await queryRunner.addColumn(
        'user_tasks',
        new TableColumn({
          name: 'started_at',
          type: 'timestamp',
          isNullable: true,
        }),
      );
    }

    if (table && !table.findColumnByName('submitted_at')) {
      await queryRunner.addColumn(
        'user_tasks',
        new TableColumn({
          name: 'submitted_at',
          type: 'timestamp',
          isNullable: true,
        }),
      );
    }

    if (table && !table.findColumnByName('completed_at')) {
      await queryRunner.addColumn(
        'user_tasks',
        new TableColumn({
          name: 'completed_at',
          type: 'timestamp',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('user_tasks', 'reward');
    await queryRunner.dropColumn('user_tasks', 'reward_received');
    await queryRunner.dropColumn('user_tasks', 'started_at');
    await queryRunner.dropColumn('user_tasks', 'submitted_at');
    await queryRunner.dropColumn('user_tasks', 'completed_at');
  }
}

