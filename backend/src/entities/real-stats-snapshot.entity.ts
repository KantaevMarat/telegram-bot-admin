import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('real_stats_snapshots')
export class RealStatsSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', default: 0 })
  users_count: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_balance: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_earned: number;

  @Column({ type: 'int', default: 0 })
  active_users_24h: number;

  @CreateDateColumn()
  taken_at: Date;
}
