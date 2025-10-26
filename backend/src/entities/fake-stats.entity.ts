import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('fake_stats')
export class FakeStats {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', default: 0 })
  online: number;

  @Column({ type: 'int', default: 0 })
  active: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paid_usdt: number;

  @CreateDateColumn()
  calculated_at: Date;
}
