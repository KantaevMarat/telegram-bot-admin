import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum RankLevel {
  STONE = 'stone',      // Камень - 0% бонус
  BRONZE = 'bronze',    // Бронза - +3% бонус
  SILVER = 'silver',    // Серебро - +7% бонус
  GOLD = 'gold',        // Золото - +12% бонус
  PLATINUM = 'platinum' // Платина - +20% бонус (платная)
}

@Entity('user_ranks')
export class UserRank {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: RankLevel,
    default: RankLevel.STONE,
  })
  current_rank: RankLevel;

  @Column({ type: 'int', default: 0 })
  tasks_completed: number; // Количество выполненных заданий

  @Column({ type: 'int', default: 0 })
  referrals_count: number; // Количество приглашенных рефералов

  @Column({ type: 'boolean', default: false })
  channels_subscribed: boolean; // Подписан ли на все обязательные каналы

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  bonus_percentage: number; // Текущий бонус в процентах

  @Column({ type: 'timestamp', nullable: true })
  platinum_expires_at: Date; // Дата окончания платиновой подписки

  @Column({ type: 'boolean', default: false })
  platinum_active: boolean; // Активна ли платиновая подписка

  @Column({ type: 'timestamp', nullable: true })
  last_notification_sent: Date; // Последнее уведомление о прогрессе

  @Column({ type: 'boolean', default: false })
  notified_80_percent: boolean; // Уведомление об 80% прогресса отправлено

  @Column({ type: 'boolean', default: false })
  notified_gold_achieved: boolean; // Уведомление о достижении Золота отправлено

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

