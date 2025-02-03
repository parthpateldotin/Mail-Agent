import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository';
import { serverConfig } from '../config/server.config';
import { Logger } from '../utils/Logger';

export class AuthController {
  private userRepo: UserRepository;

  constructor() {
    this.userRepo = new UserRepository();
  }

  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const user = await this.userRepo.validateCredentials(email, password);
      
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({ error: 'Account is deactivated' });
        return;
      }

      // Generate JWT token
      const signOptions: SignOptions = {
        expiresIn: serverConfig.jwtExpiresIn
      };

      const token = jwt.sign(
        { userId: user.id },
        serverConfig.jwtSecret,
        signOptions
      );

      // Update last login
      await this.userRepo.updateLastLogin(user.id);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      });
    } catch (error) {
      Logger.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password || !firstName || !lastName) {
        res.status(400).json({ 
          error: 'Email, password, firstName, and lastName are required' 
        });
        return;
      }

      // Check if user already exists
      const existingUser = await this.userRepo.getUserByEmail(email);
      if (existingUser) {
        res.status(400).json({ error: 'Email already registered' });
        return;
      }

      // Create new user
      const user = await this.userRepo.createUser({
        email,
        password,
        firstName,
        lastName
      });

      // Generate JWT token
      const signOptions: SignOptions = {
        expiresIn: serverConfig.jwtExpiresIn
      };

      const token = jwt.sign(
        { userId: user.id },
        serverConfig.jwtSecret,
        signOptions
      );

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      });
    } catch (error) {
      Logger.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
} 