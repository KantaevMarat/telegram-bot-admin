import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('scenarios')
export class Scenario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  trigger: string; // command or button id

  @Column({ type: 'text', nullable: true })
  response?: string; // Simple text response

  @Column({ type: 'jsonb', nullable: true })
  steps?: any[]; // Array of steps with conditions, messages, etc.

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  is_active: boolean;

  @Column({ type: 'varchar', nullable: true })
  media_url?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
