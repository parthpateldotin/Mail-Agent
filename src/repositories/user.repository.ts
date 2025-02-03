import { Repository, FindOptionsWhere } from 'typeorm';
import { User, UserRole } from '../models/user/user.entity';
import { db } from '../database/connection';
import { Logger } from '../utils/Logger';
import * as bcrypt from 'bcrypt';

export class UserRepository {
  private userRepo: Repository<User>;

  constructor() {
    this.userRepo = db.getRepository<User>(User);
  }

  public async createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
  }): Promise<User> {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = this.userRepo.create({
        ...userData,
        hashedPassword,
        role: userData.role || UserRole.AGENT
      });
      return await this.userRepo.save(user);
    } catch (error) {
      Logger.error('Error creating user:', error);
      throw error;
    }
  }

  public async getUserById(id: string): Promise<User | null> {
    try {
      return await this.userRepo.findOne({
        where: { id },
        relations: ['assignedEmails']
      });
    } catch (error) {
      Logger.error('Error getting user by ID:', error);
      throw error;
    }
  }

  public async getUserByEmail(email: string): Promise<User | null> {
    try {
      return await this.userRepo.findOne({
        where: { email }
      });
    } catch (error) {
      Logger.error('Error getting user by email:', error);
      throw error;
    }
  }

  public async updateUser(id: string, data: Partial<User>): Promise<User> {
    try {
      if (data.hashedPassword) {
        data.hashedPassword = await bcrypt.hash(data.hashedPassword, 10);
      }
      await this.userRepo.update(id, data);
      return await this.getUserById(id);
    } catch (error) {
      Logger.error('Error updating user:', error);
      throw error;
    }
  }

  public async findUsers(options: {
    role?: UserRole;
    isActive?: boolean;
    skip?: number;
    take?: number;
  }): Promise<[User[], number]> {
    try {
      const where: FindOptionsWhere<User> = {};

      if (options.role) {
        where.role = options.role;
      }
      if (options.isActive !== undefined) {
        where.isActive = options.isActive;
      }

      return await this.userRepo.findAndCount({
        where,
        skip: options.skip,
        take: options.take,
        order: { createdAt: 'DESC' }
      });
    } catch (error) {
      Logger.error('Error finding users:', error);
      throw error;
    }
  }

  public async validateCredentials(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) {
        return null;
      }

      const isValid = await bcrypt.compare(password, user.hashedPassword);
      if (!isValid) {
        return null;
      }

      return user;
    } catch (error) {
      Logger.error('Error validating credentials:', error);
      throw error;
    }
  }

  public async updateLastLogin(id: string): Promise<void> {
    try {
      await this.userRepo.update(id, {
        lastLoginAt: new Date()
      });
    } catch (error) {
      Logger.error('Error updating last login:', error);
      throw error;
    }
  }

  public async updatePreferences(id: string, preferences: Partial<User['preferences']>): Promise<User> {
    try {
      const user = await this.getUserById(id);
      if (!user) {
        throw new Error('User not found');
      }

      user.preferences = {
        ...user.preferences,
        ...preferences
      };

      return await this.userRepo.save(user);
    } catch (error) {
      Logger.error('Error updating user preferences:', error);
      throw error;
    }
  }

  public async addPermission(id: string, permission: string): Promise<User> {
    try {
      const user = await this.getUserById(id);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.permissions.includes(permission)) {
        user.permissions.push(permission);
        return await this.userRepo.save(user);
      }

      return user;
    } catch (error) {
      Logger.error('Error adding permission:', error);
      throw error;
    }
  }

  public async removePermission(id: string, permission: string): Promise<User> {
    try {
      const user = await this.getUserById(id);
      if (!user) {
        throw new Error('User not found');
      }

      user.permissions = user.permissions.filter(p => p !== permission);
      return await this.userRepo.save(user);
    } catch (error) {
      Logger.error('Error removing permission:', error);
      throw error;
    }
  }
} 