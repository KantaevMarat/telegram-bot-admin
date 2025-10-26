import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Message } from './message.entity';
import { Payout } from './payout.entity';
import { BalanceLog } from './balance-log.entity';
import { UserTask } from './user-task.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  tg_id: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  first_name: string;

  @Column({ nullable: true })
  last_name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance_usdt: number;

  @Column({ type: 'int', default: 0 })
  tasks_completed: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_earned: number;

  @Column({ type: 'varchar', default: 'active' })
  status: string; // active, blocked

  @Column({ type: 'varchar', nullable: true })
  referral_code: string;

  @Column({ type: 'uuid', nullable: true })
  referred_by: string;

  @CreateDateColumn()
  registered_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Message, (message) => message.user)
  messages: Message[];

  @OneToMany(() => Payout, (payout) => payout.user)
  payouts: Payout[];

  @OneToMany(() => BalanceLog, (log) => log.user)
  balance_logs: BalanceLog[];

  @OneToMany(() => UserTask, (userTask) => userTask.user)
  user_tasks: UserTask[];
}

