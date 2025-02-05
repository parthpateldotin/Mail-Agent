import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { EmailMetadata } from '../../types/email';

@Entity('email_responses')
export class EmailResponseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  emailId: string;

  @Column('text')
  body: string;

  @Column('jsonb')
  metadata: EmailMetadata;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 