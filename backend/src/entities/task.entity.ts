import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserTask } from './user-task.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  reward_min: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  reward_max: number;

  @Column({ type: 'text', nullable: true })
  media_url: string;

  @Column({ type: 'varchar', nullable: true })
  media_type: string;

  @Column({ type: 'int', default: 1 })
  max_per_user: number;

  @Column({ type: 'varchar', nullable: true })
  action_url: string;

  @Column({ type: 'varchar', nullable: true })
  channel_id: string; // Telegram channel ID or @username for subscription check

  @Column({ type: 'varchar', default: 'subscription' })
  task_type: string; // subscription, action, manual

  @Column({ type: 'int', default: 0 })
  cooldown_hours: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @OneToMany(() => UserTask, (userTask) => userTask.task)
  user_tasks: UserTask[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
