import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('buttons')
export class Button {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  label: string;

  @Column({ type: 'varchar' })
  action_type: string; // open_url, send_message, open_scenario, play_media, command

  @Column({ type: 'jsonb' })
  action_payload: any;

  @Column({ type: 'int', default: 0 })
  row: number;

  @Column({ type: 'int', default: 0 })
  col: number;

  @Column({ type: 'text', nullable: true })
  media_url: string;

  @Column({ type: 'varchar', nullable: true })
  command: string; // Command to execute when button is clicked (e.g., /start)

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
