import 'reflect-metadata';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { serverConfig } from './config/server.config';
import { limiter, errorHandler } from './middleware';
import { db } from './database/connection';
import { Logger } from './utils/Logger';

// Import routes
import authRoutes from './routes/auth.routes';
import emailRoutes from './routes/email.routes';
import agentRoutes from './routes/agent.routes';
import monitorRoutes from './routes/monitor.routes';
import visualizationRoutes from './routes/visualization.routes';

// Create Express app
const app = express();

// Apply middleware
app.use(helmet());
app.use(cors({
  origin: serverConfig.corsOrigin,
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

// API routes
app.use(`${serverConfig.apiPrefix}/auth`, authRoutes);
app.use(`${serverConfig.apiPrefix}/emails`, emailRoutes);
app.use(`${serverConfig.apiPrefix}/agent`, agentRoutes);
app.use(`${serverConfig.apiPrefix}/monitor`, monitorRoutes);
app.use(`${serverConfig.apiPrefix}/visualization`, visualizationRoutes);

// Health check endpoint
app.get(`${serverConfig.apiPrefix}/health`, (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handling
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    await db.initialize();
    Logger.info('Database connection initialized');

    app.listen(serverConfig.port, () => {
      Logger.info(`Server running on port ${serverConfig.port} in ${serverConfig.env} mode`);
      Logger.info(`API available at http://localhost:${serverConfig.port}${serverConfig.apiPrefix}`);
    });
  } catch (error) {
    Logger.error('Error starting server:', error);
    process.exit(1);
  }
};

process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  Logger.error('Unhandled Rejection:', error);
  process.exit(1);
});

export { app, startServer }; 