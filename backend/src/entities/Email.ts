import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable
} from 'typeorm';
import { User } from './User';
import { Folder } from './Folder';
import { EmailAnalytics, EmailMetadata } from '../types/email';

export interface Recipient {
  name?: string;
  email: string;
}

export interface Attachment {
  filename: string;
  path: string;
  contentType: string;
  size: number;
}

@Entity('emails')
export class Email {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  from: string;

  @Column('simple-array')
  to: string[];

  @Column({ nullable: true })
  subject: string;

  @Column('text')
  content: string;

  @Column('simple-array', { nullable: true })
  cc?: string[];

  @Column('simple-array', { nullable: true })
  bcc?: string[];

  @Column('jsonb', { nullable: true })
  attachments?: {
    filename: string;
    content: string;
    contentType: string;
    size: number;
  }[];

  @Column('jsonb', { nullable: true })
  metadata?: EmailMetadata;

  @Column('jsonb', { nullable: true })
  analytics?: EmailAnalytics;

  @Column('simple-array', { nullable: true })
  labels?: string[];

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: false })
  isStarred: boolean;

  @Column({ default: false })
  isDraft: boolean;

  @Column({ default: false })
  isDeleted: boolean;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @ManyToMany(() => Folder, folder => folder.emails)
  folders: Folder[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 