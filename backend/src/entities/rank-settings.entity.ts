import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('rank_settings')
export class RankSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Требования для Бронзы
  @Column({ type: 'boolean', default: true })
  bronze_requires_channels: boolean;

  // Требования для Серебра
  @Column({ type: 'int', default: 10 })
  silver_required_tasks: number;

  @Column({ type: 'int', default: 1 })
  silver_required_referrals: number;

  // Требования для Золота
  @Column({ type: 'int', default: 50 })
  gold_required_tasks: number;

  @Column({ type: 'int', default: 3 })
  gold_required_referrals: number;

  // Стоимость Платиновой подписки
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 500 })
  platinum_price_usd: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 500 })
  platinum_price_rub: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 250 })
  platinum_price_uah: number;

  @Column({ type: 'int', default: 30 })
  platinum_duration_days: number; // Длительность подписки в днях

  // Процент бонусов для каждого ранга
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  stone_bonus: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 3 })
  bronze_bonus: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 7 })
  silver_bonus: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 12 })
  gold_bonus: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 20 })
  platinum_bonus: number;

  // Настройки уведомлений
  @Column({ type: 'text', nullable: true })
  notification_80_percent: string; // Шаблон уведомления об 80% прогресса

  @Column({ type: 'text', nullable: true })
  notification_gold_achieved: string; // Шаблон уведомления о достижении Золота

  @Column({ type: 'text', nullable: true })
  notification_weekly_reminder: string; // Еженедельное напоминание

  @Column({ type: 'text', nullable: true })
  notification_expiry_warning: string; // Предупреждение об истечении подписки

  @Column({ type: 'text', nullable: true })
  premium_info_message: string; // Сообщение для команды !premium_info

  @Column({ type: 'text', nullable: true })
  manager_username: string; // Username персонального менеджера

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

