export enum SystemFolderType {
  INBOX = 'inbox',
  SENT = 'sent',
  DRAFTS = 'drafts',
  TRASH = 'trash',
  SPAM = 'spam',
  ARCHIVE = 'archive'
}

export type FolderType = 'system' | 'custom';

export interface Folder {
  id: string;
  name: string;
  color: string;
  type: FolderType;
  systemType: SystemFolderType | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderStats {
  [folderId: string]: {
    emailCount: number;
  };
}

export interface CreateFolderData {
  name: string;
  color: string;
}

export interface UpdateFolderData {
  name?: string;
  color?: string;
} 