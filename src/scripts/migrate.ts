import { db } from '../database/connection';
import { Logger } from '../utils/Logger';

async function runMigrations() {
  try {
    Logger.info('Starting database migrations...');
    
    // Initialize database connection
    await db.initialize();
    const dataSource = db.getDataSource();

    // Run pending migrations
    const pendingMigrations = await dataSource.showMigrations();
    if (!pendingMigrations) {
      Logger.info('No pending migrations found');
      return;
    }

    await dataSource.runMigrations();
    Logger.info('Migrations completed successfully');

  } catch (error) {
    Logger.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

// Run migrations
runMigrations(); 