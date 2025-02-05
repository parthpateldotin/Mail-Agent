import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { Folder, SystemFolderType } from '../entities/Folder';
import { Settings } from '../entities/Settings';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createAdminUser() {
  const userRepository = AppDataSource.getRepository(User);
  const folderRepository = AppDataSource.getRepository(Folder);
  const settingsRepository = AppDataSource.getRepository(Settings);

  try {
    // Check if admin exists
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@aimail.com';
    let admin = await userRepository.findOne({ where: { email: adminEmail } });

    if (!admin) {
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const newAdmin = userRepository.create({
        email: adminEmail,
        name: 'Admin',
        password: hashedPassword,
        role: UserRole.ADMIN,
        isVerified: true,
        isActive: true,
      });

      admin = await userRepository.save(newAdmin);

      // Create system folders
      for (const type of Object.values(SystemFolderType)) {
        const folder = folderRepository.create({
          name: type.charAt(0).toUpperCase() + type.slice(1).toLowerCase(),
          type: 'system',
          systemType: type,
          color: '#808080',
          user: admin,
          userId: admin.id,
        });
        await folderRepository.save(folder);
      }

      // Create default settings
      const settings = settingsRepository.create({
        user: admin,
        userId: admin.id,
        theme: 'system',
        language: 'en',
        emailsPerPage: 20,
        autoRefreshInterval: 300,
        notifications: {
          enabled: true,
          sound: true,
          desktop: true,
        },
        defaultReplyBehavior: 'reply',
        emailSettings: {
          signature: '',
          sendDelay: 0,
          defaultFolder: SystemFolderType.INBOX,
          notifications: {
            newEmail: true,
            mentions: true,
            reminders: true,
          },
          filters: [],
        },
        aiSettings: {
          smartReplyStyle: 'professional',
          enableAutoComplete: true,
          enableSmartCompose: true,
          enableSummary: true,
          enableCategories: true,
          enablePriority: true,
          languageModel: 'gpt-4',
        },
      });
      await settingsRepository.save(settings);

      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}

async function initializeDatabase() {
  try {
    await AppDataSource.initialize();
    console.log('Database connection initialized');

    await createAdminUser();
    console.log('Database initialization completed');

    // Exit successfully
    process.exit(0);
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase(); 