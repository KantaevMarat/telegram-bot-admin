import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Task } from './task.entity';

@Entity('user_tasks')
export class UserTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, (user) => user.user_tasks)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  task_id: string;

  @ManyToOne(() => Task, (task) => task.user_tasks)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  reward: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  reward_received: number;

  @Column({ type: 'varchar', default: 'pending' })
  status: string; // pending, in_progress, submitted, completed, rejected

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  submitted_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;
}
