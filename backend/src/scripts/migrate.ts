import { DataSource } from 'typeorm';
import { config } from '../config';
import { User } from '../entities/User';
import { Folder } from '../entities/Folder';
import { Email } from '../entities/Email';
import { Settings } from '../entities/Settings';

const dataSource = new DataSource({
  ...config.database,
  entities: [User, Folder, Email, Settings],
});

async function migrate() {
  try {
    await dataSource.initialize();
    console.log('Connected to database');

    // Enable uuid-ossp extension for UUID generation
    await dataSource.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Run migrations
    await dataSource.runMigrations();
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

migrate(); 