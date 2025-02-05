import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Email } from './email.entity';

@Entity('email_attachments')
export class EmailAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Email, email => email.attachments)
  email: Email;

  @Column()
  filename: string;

  @Column()
  contentType: string;

  @Column('bigint')
  size: number;

  @Column()
  path: string;

  @Column({ nullable: true })
  checksum: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column('jsonb', { nullable: true })
  metadata: {
    originalName: string;
    encoding: string;
    mimeType: string;
    extension: string;
  };
} 