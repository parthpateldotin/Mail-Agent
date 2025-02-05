import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../entities/User';
import { TokenPayload } from '../types/token';

export const generateToken = (user: User): string => {
  const payload: Omit<TokenPayload, 'exp'> = {
    id: user.id,
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const options: SignOptions = {
    expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '900'), // 15 minutes in seconds
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', options);
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as TokenPayload;
  } catch (error) {
    return null;
  }
};

export const generateRefreshToken = (user: User): string => {
  const payload: Omit<TokenPayload, 'exp'> = {
    id: user.id,
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const options: SignOptions = {
    expiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '604800'), // 7 days in seconds
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key', options);
}; 