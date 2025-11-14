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

export enum PaymentMethod {
  USD_BALANCE = 'usd_balance',   // Оплата с баланса в USD
  RUB_REQUISITES = 'rub_requisites', // Оплата рублями на реквизиты
  UAH_REQUISITES = 'uah_requisites', // Оплата гривнами на реквизиты
}

export enum RequestStatus {
  NEW = 'new',                    // Новый запрос
  IN_PROGRESS = 'in_progress',    // В обработке
  REQUISITES_SENT = 'requisites_sent', // Реквизиты отправлены
  PAYMENT_CONFIRMED = 'payment_confirmed', // Оплата подтверждена
  COMPLETED = 'completed',        // Подписка активирована
  CANCELLED = 'cancelled',        // Отменен
}

@Entity('premium_requests')
export class PremiumRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  request_number: string; // RUB-XXXXX, UAH-XXXXX, USD-XXXXX

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  payment_method: PaymentMethod;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10 })
  currency: string; // USD, RUB, UAH

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.NEW,
  })
  status: RequestStatus;

  @Column({ type: 'text', nullable: true })
  admin_notes: string; // Заметки администратора

  @Column({ type: 'bigint', nullable: true })
  processed_by_admin: string; // Telegram ID админа, который обработал

  @Column({ type: 'timestamp', nullable: true })
  requisites_sent_at: Date; // Когда отправлены реквизиты

  @Column({ type: 'timestamp', nullable: true })
  payment_confirmed_at: Date; // Когда подтверждена оплата

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date; // Когда активирована подписка

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

