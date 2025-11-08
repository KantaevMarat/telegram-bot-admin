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

  @Column({ type: 'text' })
  response: string; // Response text when command is executed

  @Column({ type: 'varchar', nullable: true })
  media_url?: string; // Optional media to send with response

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

