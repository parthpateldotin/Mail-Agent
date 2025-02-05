import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { getRepository } from 'typeorm';
import { User, UserRole } from '../entities/User';
import { AppError } from '../utils/AppError';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface JwtPayload {
  userId: string;
  email: string;
  role?: string;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as { userId: string; email: string; role?: string };

    // Get user from database
    const user = await getRepository(User).findOne({
      where: { id: decoded.userId, isActive: true }
    });

    if (!user) {
      throw AppError.unauthorized('User not found or inactive');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(AppError.unauthorized('Invalid token'));
    } else {
      next(error);
    }
  }
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== UserRole.ADMIN) {
    throw AppError.forbidden('Admin access required');
  }
  next();
};

export const requireVerified = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.isVerified) {
    throw AppError.forbidden('Email verification required');
  }
  next();
};

export const generateTokens = (user: User) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  return { accessToken, refreshToken };
};

export const generateAccessToken = (payload: { userId: string; email: string; role?: string }) => {
  const signOptions: SignOptions = {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN
      ? parseInt(process.env.JWT_ACCESS_EXPIRES_IN)
      : 900, // 15 minutes in seconds
  };
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', signOptions);
};

export const generateRefreshToken = (payload: { userId: string; email: string; role?: string }) => {
  const refreshSignOptions: SignOptions = {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN
      ? parseInt(process.env.JWT_REFRESH_EXPIRES_IN)
      : 604800, // 7 days in seconds
  };
  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    refreshSignOptions
  );
}; 