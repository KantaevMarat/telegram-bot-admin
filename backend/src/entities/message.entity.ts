import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, (user) => user.messages)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'bigint', nullable: true })
  from_admin_tg_id: string | null;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'text', nullable: true })
  media_url: string;

  @Column({ type: 'varchar', nullable: true })
  media_type: string; // photo, video, document

  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @Column({ type: 'varchar', default: 'sent' })
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  delivered_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  read_at: Date | null;
}
