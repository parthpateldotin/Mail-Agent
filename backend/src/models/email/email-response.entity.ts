import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Email } from './email.entity';
import { EmailMetadata } from '../../services/email/types';

@Entity('email_responses')
export class EmailResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Email, email => email.responses)
  email: Email;

  @Column()
  inReplyTo: string;

  @Column()
  subject: string;

  @Column('text')
  content: string;

  @Column('jsonb')
  metadata: EmailMetadata;

  @Column('jsonb')
  context: {
    intent: string;
    entities: Record<string, any>;
    confidence: number;
  };

  @Column({
    type: 'enum',
    enum: ['draft', 'ready', 'sent', 'failed'],
    default: 'draft'
  })
  status: 'draft' | 'ready' | 'sent' | 'failed';

  @Column({ nullable: true })
  sentAt: Date;

  @Column({ nullable: true })
  error: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('jsonb', { nullable: true })
  customFields: Record<string, any>;
} 