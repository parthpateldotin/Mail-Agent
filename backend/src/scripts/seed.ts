import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { Folder, SystemFolderType } from '../entities/Folder';
import { Settings } from '../entities/Settings';

const createSystemFolders = async (user: User) => {
  const folderRepository = AppDataSource.getRepository(Folder);
  
  const systemFolders = [
    { name: 'Inbox', systemType: SystemFolderType.INBOX, order: 1 },
    { name: 'Sent', systemType: SystemFolderType.SENT, order: 2 },
    { name: 'Drafts', systemType: SystemFolderType.DRAFTS, order: 3 },
    { name: 'Trash', systemType: SystemFolderType.TRASH, order: 4 },
    { name: 'Spam', systemType: SystemFolderType.SPAM, order: 5 },
    { name: 'Archive', systemType: SystemFolderType.ARCHIVE, order: 6 },
  ];

  for (const folder of systemFolders) {
    await folderRepository.save(
      folderRepository.create({
        ...folder,
        user,
      })
    );
  }
};

const createDefaultSettings = async (user: User) => {
  const settingsRepository = AppDataSource.getRepository(Settings);

  const settings = settingsRepository.create({
    user,
    emailSettings: {
      signature: '',
      replyTo: user.email,
      sendDelay: 0,
      defaultFolder: SystemFolderType.INBOX,
      notifications: {
        newEmail: true,
        mentions: true,
        reminders: true
      },
      filters: []
    },
    aiSettings: {
      smartReplyStyle: 'professional' as const,
      enableAutoComplete: true,
      enableSmartCompose: true,
      enableSummary: true,
      enableCategories: true,
      enablePriority: true,
      languageModel: 'gpt-4'
    }
  });

  await settingsRepository.save(settings);
};

const seed = async () => {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('Database connected');

    const userRepository = AppDataSource.getRepository(User);

    // Create admin user
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await userRepository.save(
      userRepository.create({
        email: 'admin@aimail.com',
        name: 'Admin',
        password: hashedAdminPassword,
        role: UserRole.ADMIN,
        isVerified: true
      })
    );

    // Create system folders for admin
    await createSystemFolders(admin);

    // Create settings for admin
    await createDefaultSettings(admin);

    // Create test user
    const userPassword = process.env.TEST_USER_PASSWORD || 'User123!';
    const hashedUserPassword = await bcrypt.hash(userPassword, 10);

    const user = await userRepository.save(
      userRepository.create({
        email: 'user@aimail.com',
        name: 'Test User',
        password: hashedUserPassword,
        role: UserRole.USER,
        isVerified: true
      })
    );

    // Create system folders for user
    await createSystemFolders(user);

    // Create settings for user
    await createDefaultSettings(user);

    console.log('Seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run seed
seed(); 