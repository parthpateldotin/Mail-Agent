import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne
} from 'typeorm';
import { Email } from './Email';
import { Folder } from './Folder';
import { Settings } from './Settings';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
  })
  role: UserRole;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @OneToMany(() => Email, email => email.user)
  emails: Email[];

  @OneToMany(() => Folder, folder => folder.user)
  folders: Folder[];

  @OneToOne(() => Settings, settings => settings.user)
  settings: Settings;

  @Column({ nullable: true })
  refreshToken?: string;

  @Column({ nullable: true })
  verificationToken?: string;

  @Column({ nullable: true })
  resetPasswordToken?: string;

  @Column({ nullable: true })
  resetPasswordExpires?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper method to check if user is admin
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  // Helper method to check if account is active and verified
  isAccountValid(): boolean {
    return this.isActive && this.isVerified;
  }
} 