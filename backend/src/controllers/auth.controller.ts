import { Request, Response, NextFunction } from 'express';
import { Repository } from 'typeorm';
import { User } from '../entities/User';
import { AppError } from '../utils/AppError';
import { generateToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import { comparePassword, hashPassword } from '../utils/password';
import { AppDataSource } from '../config/database';
import { TokenResponse } from '../types/token';

export class AuthController {
  private userRepository: Repository<User>;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // Don't initialize in constructor
  }

  private async initializeRepository() {
    if (!this.initialized && !this.initializationPromise) {
      this.initializationPromise = (async () => {
        try {
          if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
          }
          this.userRepository = AppDataSource.getRepository(User);
          this.initialized = true;
        } catch (error) {
          console.error('Failed to initialize repository:', error);
          throw error;
        }
      })();
    }
    await this.initializationPromise;
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeRepository();
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      await this.ensureInitialized();
      const { email, password, name } = req.body;

      // Check if user exists
      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (existingUser) {
        throw AppError.badRequest('User already exists');
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = this.userRepository.create({
        email,
        password: hashedPassword,
        name
      });

      await this.userRepository.save(user);

      // Generate tokens
      const accessToken = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      const response: TokenResponse = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        accessToken,
        refreshToken
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      await this.ensureInitialized();
      const { email, password } = req.body;

      // Find user
      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        throw AppError.unauthorized('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw AppError.unauthorized('Invalid credentials');
      }

      // Generate tokens
      const accessToken = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      const response: TokenResponse = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        accessToken,
        refreshToken
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      await this.ensureInitialized();
      const { refreshToken } = req.body;

      // Verify refresh token
      const decoded = verifyToken(refreshToken);
      if (!decoded) {
        throw AppError.unauthorized('Invalid refresh token');
      }

      // Find user
      const user = await this.userRepository.findOne({ where: { id: decoded.userId } });
      if (!user) {
        throw AppError.unauthorized('User not found');
      }

      // Generate new tokens
      const accessToken = generateToken(user);
      const newRefreshToken = generateRefreshToken(user);

      res.json({
        accessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      await this.ensureInitialized();

      const userId = req.user?.id;
      if (!userId) {
        throw AppError.unauthorized('Not authenticated');
      }

      // Clear refresh token
      await this.userRepository.update(userId, { refreshToken: undefined });

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      // TODO: Generate reset token
      // TODO: Send reset email

      res.json({
        status: 'success',
        message: 'Password reset instructions sent to your email',
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;

      // TODO: Validate reset token
      // TODO: Update password

      res.json({
        status: 'success',
        message: 'Password successfully reset',
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;

      // TODO: Validate current password
      // TODO: Update password

      res.json({
        status: 'success',
        message: 'Password successfully changed',
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      await this.ensureInitialized();
      const userId = req.user?.id;

      if (!userId) {
        throw AppError.unauthorized('Not authenticated');
      }

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw AppError.notFound('User not found');
      }

      res.json({
        id: user.id,
        email: user.email,
        name: user.name
      });
    } catch (error) {
      next(error);
    }
  }
} 