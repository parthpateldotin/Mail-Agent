import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { User } from '../user/user.entity';
import { EmailResponse } from './email-response.entity';
import { EmailAttachment } from './email-attachment.entity';

export enum EmailStatus {
  RECEIVED = 'received',
  PARSED = 'parsed',
  ANALYZED = 'analyzed',
  GENERATING_RESPONSE = 'generating_response',
  RESPONSE_READY = 'response_ready',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
  PROCESSING = 'processing'
}

export interface ProcessingInfo {
  attempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  processingTime?: number;
  completedSteps: string[];
  nextStep?: string;
  lastProcessed?: Date;
}

export interface EmailMetadata {
  categories: string[];
  priority: 'high' | 'medium' | 'low';
  language: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  isAutoReply: boolean;
  requiresResponse: boolean;
}

@Entity('emails')
export class Email {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  messageId: string;

  @Column()
  from: string;

  @Column('text', { array: true })
  to: string[];

  @Column()
  subject: string;

  @Column('text')
  content: string;

  @Column('jsonb')
  metadata: EmailMetadata;

  @Column('jsonb')
  processingInfo: ProcessingInfo;

  @Column({
    type: 'enum',
    enum: EmailStatus,
    default: EmailStatus.RECEIVED
  })
  @Index()
  status: EmailStatus;

  @Column({ nullable: true })
  threadId: string;

  @ManyToOne(() => User, { nullable: true })
  assignedTo: User;

  @OneToMany(() => EmailResponse, response => response.email)
  responses: EmailResponse[];

  @OneToMany(() => EmailAttachment, attachment => attachment.email)
  attachments: EmailAttachment[];

  @Column('jsonb', { nullable: true })
  context: {
    intent: string;
    entities: Record<string, any>;
    confidence: number;
  };

  @Column({ default: false })
  isArchived: boolean;

  @Column({ default: false })
  isSpam: boolean;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastResponseAt: Date;

  @Column('text', { array: true, default: [] })
  labels: string[];

  @Column({ default: 0 })
  responseCount: number;

  @Column('jsonb', { nullable: true })
  customFields: Record<string, any>;
} 