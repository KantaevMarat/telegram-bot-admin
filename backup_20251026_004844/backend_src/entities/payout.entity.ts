import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('payouts')
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, (user) => user.payouts)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar' })
  method: string; // bank, crypto, paypal, etc.

  @Column({ type: 'text', nullable: true })
  method_details: string; // account number, wallet address, etc.

  @Column({ type: 'varchar', default: 'pending' })
  status: string; // pending, approved, declined

  @Column({ type: 'text', nullable: true })
  reason_if_declined: string;

  @Column({ type: 'bigint', nullable: true })
  processed_by_admin_tg_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

