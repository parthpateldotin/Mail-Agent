import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Email } from '../email/email.entity';

export enum UserRole {
  ADMIN = 'admin',
  AGENT = 'agent',
  VIEWER = 'viewer'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  hashedPassword: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.AGENT
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @OneToMany(() => Email, email => email.assignedTo)
  assignedEmails: Email[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('jsonb', { nullable: true })
  preferences: {
    theme?: 'light' | 'dark';
    notifications?: boolean;
    emailsPerPage?: number;
  };

  @Column('text', { array: true, default: [] })
  permissions: string[];
} 