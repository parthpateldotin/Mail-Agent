import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Email } from '../entities/Email';
import { Folder } from '../entities/Folder';
import { Settings } from '../entities/Settings';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_SERVER || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'aimail',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
  entities: [User, Email, Folder, Settings],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
});

export const initializeDatabase = async (retries = 5, delay = 5000): Promise<DataSource> => {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
      return AppDataSource;
    } catch (error) {
      lastError = error;
      console.error(`Failed to connect to database (attempt ${i + 1}/${retries}):`, error);
      
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to initialize database after ${retries} attempts: ${lastError}`);
};

export const getDataSource = (): DataSource => {
  if (!AppDataSource.isInitialized) {
    throw new Error('Database connection not initialized');
  }
  return AppDataSource;
};

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Database connection closed.');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error during database shutdown:', error);
    process.exit(1);
  }
});