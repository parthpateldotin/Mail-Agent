import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from 'dotenv';
import { errorHandler } from './middleware/error';
import authRoutes from './routes/auth.routes';
import emailRoutes from './routes/email.routes';
import folderRoutes from './routes/folder.routes';
import settingsRoutes from './routes/settings.routes';
import aiRoutes from './routes/ai.routes';
import { initializeDatabase, AppDataSource } from './config/database';
import morgan from 'morgan';

// Load environment variables
config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

const startServer = async () => {
  try {
    // Initialize database first
    const dataSource = await initializeDatabase();
    console.log('✅ Database connection established');

    // Only setup routes after database is initialized
    app.use('/api/auth', authRoutes);
    app.use('/api/emails', emailRoutes);
    app.use('/api/folders', folderRoutes);
    app.use('/api/settings', settingsRoutes);
    app.use('/api/ai', aiRoutes);

    // Error handling
    app.use(errorHandler);

    // Start server
    const port = process.env.PORT || 3001;
    app.listen(port, () => {
      console.log(`✅ Server is running on port ${port}`);
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      try {
        if (dataSource.isInitialized) {
          await dataSource.destroy();
          console.log('Database connection closed.');
        }
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 