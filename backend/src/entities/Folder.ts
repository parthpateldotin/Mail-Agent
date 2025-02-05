import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, CreateDateColumn, UpdateDateColumn, JoinTable } from 'typeorm';
import { User } from './User';
import { Email } from './Email';

export enum SystemFolderType {
  INBOX = 'inbox',
  SENT = 'sent',
  DRAFTS = 'drafts',
  TRASH = 'trash',
  SPAM = 'spam',
  ARCHIVE = 'archive'
}

export type FolderType = 'system' | 'custom';

@Entity('folders')
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: ['system', 'custom'],
    default: 'custom'
  })
  type: FolderType;

  @Column({
    type: 'enum',
    enum: SystemFolderType,
    nullable: true
  })
  systemType?: SystemFolderType;

  @Column({ default: '#808080' })
  color: string;

  @Column({ nullable: true })
  icon?: string;

  @Column({ default: 0 })
  order: number;

  @ManyToOne(() => User, user => user.folders)
  user: User;

  @Column()
  userId: string;

  @ManyToMany(() => Email)
  @JoinTable({
    name: 'folder_emails',
    joinColumn: { name: 'folderId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'emailId', referencedColumnName: 'id' }
  })
  emails: Email[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 