import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('broadcasts')
export class Broadcast {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'jsonb', nullable: true })
  media_urls: string[] | null;

  @Column({ type: 'varchar', default: 'draft' })
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';

  @Column({ type: 'timestamp', nullable: true })
  scheduled_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date | null;

  @Column({ type: 'int', default: 0 })
  total_users: number;

  @Column({ type: 'int', default: 0 })
  sent_count: number;

  @Column({ type: 'int', default: 0 })
  failed_count: number;

  @Column({ type: 'int', default: 30 })
  batch_size: number;

  @Column({ type: 'int', default: 1000 })
  throttle_ms: number;

  @Column({ type: 'varchar', nullable: true })
  created_by_admin_tg_id: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

