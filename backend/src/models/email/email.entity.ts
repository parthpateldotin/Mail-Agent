import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { User } from '../user/user.entity';
import { EmailResponse } from './email-response.entity';
import { EmailAttachment } from './email-attachment.entity';

export interface EmailMetadata {
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  date: Date;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
}

export interface ProcessingInfo {
  startTime: Date;
  endTime?: Date;
  duration?: number;
  attempts: number;
  error?: string;
}

export enum EmailStatus {
  RECEIVED = 'received',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  SENT = 'sent'
}

@Entity()
export class Email {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('jsonb')
  metadata!: EmailMetadata;

  @Column('jsonb')
  processingInfo!: ProcessingInfo;

  @Column({
    type: 'enum',
    enum: EmailStatus,
    default: EmailStatus.RECEIVED
  })
  @Index()
  status!: EmailStatus;

  @Column({ nullable: true })
  threadId!: string;

  @ManyToOne(() => User, { nullable: true })
  assignedTo!: User;

  @OneToMany(() => EmailResponse, response => response.email)
  responses!: EmailResponse[];

  @OneToMany(() => EmailAttachment, attachment => attachment.email)
  attachments!: EmailAttachment[];

  @Column('jsonb', { nullable: true })
  context!: {
    sentiment?: string;
    priority?: number;
    category?: string;
    keywords?: string[];
    summary?: string;
  };

  @Column({ default: false })
  isArchived!: boolean;

  @Column({ default: false })
  isSpam!: boolean;

  @CreateDateColumn()
  @Index()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ nullable: true })
  lastResponseAt!: Date;

  @Column('text', { array: true, default: [] })
  labels!: string[];

  @Column({ default: 0 })
  responseCount!: number;

  @Column('jsonb', { nullable: true })
  customFields!: Record<string, any>;

  constructor(partial: Partial<Email>) {
    Object.assign(this, partial);
  }
}