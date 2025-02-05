import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';
import { SystemFolderType } from './Folder';

export interface EmailSettings {
  signature?: string;
  replyTo?: string;
  sendDelay?: number;
  defaultFolder?: SystemFolderType;
  notifications?: {
    newEmail: boolean;
    mentions: boolean;
    reminders: boolean;
  };
  filters?: {
    name: string;
    condition: string;
    action: string;
  }[];
}

export interface AISettings {
  smartReplyStyle?: 'professional' | 'casual' | 'friendly';
  enableAutoComplete?: boolean;
  enableSmartCompose?: boolean;
  enableSummary?: boolean;
  enableCategories?: boolean;
  enablePriority?: boolean;
  languageModel?: string;
}

@Entity('settings')
export class Settings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.settings)
  user: User;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: ['light', 'dark', 'system'],
    default: 'system'
  })
  theme: string;

  @Column({ default: 'en' })
  language: string;

  @Column({ default: 20 })
  emailsPerPage: number;

  @Column('jsonb', { nullable: true })
  notifications?: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };

  @Column({ default: 300 })
  autoRefreshInterval: number;

  @Column({ type: 'text', nullable: true })
  signature?: string;

  @Column({
    type: 'enum',
    enum: ['reply', 'replyAll'],
    default: 'reply'
  })
  defaultReplyBehavior: string;

  @Column('jsonb', { nullable: true })
  emailSettings?: EmailSettings;

  @Column('jsonb', { nullable: true })
  aiSettings?: AISettings;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 