import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { serverConfig } from '../config/server.config';
import { UserRepository } from '../repositories/user.repository';
import { Logger } from '../utils/Logger';

// Rate limiting middleware
export const limiter = rateLimit({
  windowMs: serverConfig.rateLimitWindow,
  max: serverConfig.rateLimitMax,
  message: { error: 'Too many requests, please try again later.' }
});

// Error handling middleware
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  Logger.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    res.status(400).json({ error: err.message });
    return;
  }
  
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  
  res.status(500).json({ error: 'Internal server error' });
};

// Authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, serverConfig.jwtSecret) as { userId: string };
    
    const userRepo = new UserRepository();
    const user = await userRepo.getUserById(decoded.userId);
    
    if (!user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    
    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated' });
      return;
    }
    
    // Attach user to request
    (req as any).user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Role authorization middleware
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }
    
    next();
  };
};

// Request validation middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = [];
  
  if (!req.body) {
    errors.push('Request body is required');
  }
  
  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }
  
  next();
}; 