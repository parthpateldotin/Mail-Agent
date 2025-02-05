import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { AppError } from '../utils/AppError';
import { generateToken, verifyToken } from '../utils/jwt';
import { comparePassword, hashPassword } from '../utils/password';

export class AuthController {
    private userRepository: Repository<User>;
    private initialized: boolean = false;

    constructor() {
        this.initializeRepository();
    }

    private async initializeRepository() {
        try {
            this.userRepository = AppDataSource.getRepository(User);
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize user repository:', error);
            throw error;
        }
    }

    private async ensureInitialized() {
        if (!this.initialized) {
            await this.initializeRepository();
        }
    }

    async register(email: string, password: string) {
        await this.ensureInitialized();
        
        const existingUser = await this.userRepository.findOne({ where: { email } });
        if (existingUser) {
            throw new AppError('User already exists', 400);
        }

        const hashedPassword = await hashPassword(password);
        const user = this.userRepository.create({
            email,
            password: hashedPassword,
        });

        await this.userRepository.save(user);
        const token = generateToken(user);
        return { user, token };
    }

    async login(email: string, password: string) {
        await this.ensureInitialized();
        
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            throw new AppError('Invalid credentials', 401);
        }

        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            throw new AppError('Invalid credentials', 401);
        }

        const token = generateToken(user);
        return { user, token };
    }

    async refreshToken(token: string) {
        await this.ensureInitialized();
        
        const decoded = verifyToken(token);
        if (!decoded) {
            throw new AppError('Invalid token', 401);
        }

        const user = await this.userRepository.findOne({ where: { id: decoded.id } });
        if (!user) {
            throw new AppError('User not found', 404);
        }

        const newToken = generateToken(user);
        return { user, token: newToken };
    }

    async logout(token: string) {
        await this.ensureInitialized();
        
        const decoded = verifyToken(token);
        if (!decoded) {
            throw new AppError('Invalid token', 401);
        }

        return { message: 'Logged out successfully' };
    }

    async me(token: string) {
        await this.ensureInitialized();
        
        const decoded = verifyToken(token);
        if (!decoded) {
            throw new AppError('Invalid token', 401);
        }

        const user = await this.userRepository.findOne({ where: { id: decoded.id } });
        if (!user) {
            throw new AppError('User not found', 404);
        }

        return user;
    }
} 