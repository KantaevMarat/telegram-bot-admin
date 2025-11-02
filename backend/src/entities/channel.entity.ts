import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('channels')
export class Channel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  channel_id: string; // @username или -1001234567890 для приватных

  @Column({ type: 'varchar', length: 255 })
  title: string; // Название канала

  @Column({ type: 'varchar', length: 255, nullable: true })
  username: string; // @username без @

  @Column({ type: 'text', nullable: true })
  url: string; // Полная ссылка на канал

  @Column({ type: 'boolean', default: true })
  is_active: boolean; // Активна ли проверка этого канала

  @Column({ type: 'int', default: 0 })
  order: number; // Порядок отображения

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

