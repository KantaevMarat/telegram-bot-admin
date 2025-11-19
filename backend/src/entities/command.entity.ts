import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('commands')
export class Command {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string; // Command name (e.g., /mycommand)

  @Column({ type: 'text' })
  description: string; // Description of what the command does

  @Column({ type: 'text', nullable: true })
  response: string; // Response text when command is executed (legacy, for backward compatibility)

  @Column({ type: 'varchar', nullable: true })
  media_url?: string; // Optional media to send with response (legacy, for backward compatibility)

  @Column({ type: 'varchar', default: 'text' })
  action_type: string; // text, media, url, function, command

  @Column({ type: 'jsonb', nullable: true })
  action_payload: any; // Payload for different action types (similar to buttons)

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

