import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class Settings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'varchar', nullable: true })
  description: string;

  @Column({ type: 'bigint', nullable: true })
  updated_by_admin_tg_id: string;

  @UpdateDateColumn()
  updated_at: Date;
}
