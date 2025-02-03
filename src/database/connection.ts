import { DataSource } from 'typeorm';
import { databaseConfig } from '../config/database.config';
import { Logger } from '../utils/Logger';

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private dataSource: DataSource;
  private isInitialized: boolean = false;

  private constructor() {
    this.dataSource = new DataSource(databaseConfig);
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      Logger.warn('Database connection is already initialized');
      return;
    }

    try {
      await this.dataSource.initialize();
      this.isInitialized = true;
      Logger.info('Database connection initialized successfully');
    } catch (error) {
      Logger.error('Error initializing database connection:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isInitialized) {
      Logger.warn('Database connection is not initialized');
      return;
    }

    try {
      await this.dataSource.destroy();
      this.isInitialized = false;
      Logger.info('Database connection closed successfully');
    } catch (error) {
      Logger.error('Error closing database connection:', error);
      throw error;
    }
  }

  public getDataSource(): DataSource {
    if (!this.isInitialized) {
      throw new Error('Database connection is not initialized');
    }
    return this.dataSource;
  }

  public getRepository<T>(entity: any) {
    return this.getDataSource().getRepository<T>(entity);
  }
}

export const db = DatabaseConnection.getInstance(); 