import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('settings_history')
export class SettingsHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  setting_key: string;

  @Column({ type: 'text', nullable: true })
  old_value: string;

  @Column({ type: 'text' })
  new_value: string;

  @Column({ type: 'varchar', nullable: true })
  change_reason: string;

  @Column({ type: 'bigint', nullable: true })
  admin_tg_id: string;

  @Column({ type: 'varchar', nullable: true })
  admin_username: string;

  @Column({ type: 'varchar', nullable: true })
  admin_first_name: string;

  @Column({ type: 'varchar', nullable: true })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string;

  @CreateDateColumn()
  created_at: Date;
}
