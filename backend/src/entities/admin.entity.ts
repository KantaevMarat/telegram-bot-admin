import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  tg_id: string;

  @Column({ type: 'varchar', default: 'admin' })
  role: string; // superadmin, admin

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  first_name: string;

  @CreateDateColumn()
  created_at: Date;
}
