import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Folder, SystemFolderType, FolderType } from '../entities/Folder';
import { User } from '../entities/User';
import { AppError } from '../utils/AppError';

export class FolderController {
    private folderRepository: Repository<Folder>;
    private userRepository: Repository<User>;
    private initialized: boolean = false;

    constructor() {
        this.initializeRepositories();
    }

    private async initializeRepositories() {
        try {
            this.folderRepository = AppDataSource.getRepository(Folder);
            this.userRepository = AppDataSource.getRepository(User);
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize repositories:', error);
            throw error;
        }
    }

    private async ensureInitialized() {
        if (!this.initialized) {
            await this.initializeRepositories();
        }
    }

    async createFolder(name: string, userId: string) {
        await this.ensureInitialized();

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw AppError.notFound('User not found');
        }

        const folder = this.folderRepository.create({
            name,
            userId,
            type: 'custom' as FolderType,
            color: '#808080'
        });

        return await this.folderRepository.save(folder);
    }

    async getFolders(userId: string) {
        await this.ensureInitialized();

        return await this.folderRepository.find({
            where: { userId },
            order: {
                order: 'ASC',
                name: 'ASC'
            }
        });
    }

    async getFolder(folderId: string, userId: string) {
        await this.ensureInitialized();

        const folder = await this.folderRepository.findOne({
            where: { id: folderId, userId }
        });

        if (!folder) {
            throw AppError.notFound('Folder not found');
        }

        return folder;
    }

    async updateFolder(folderId: string, userId: string, name: string) {
        await this.ensureInitialized();

        const folder = await this.getFolder(folderId, userId);
        if (folder.type === 'system') {
            throw AppError.badRequest('Cannot update system folder');
        }

        folder.name = name;
        return await this.folderRepository.save(folder);
    }

    async deleteFolder(folderId: string, userId: string) {
        await this.ensureInitialized();

        const folder = await this.getFolder(folderId, userId);
        if (folder.type === 'system') {
            throw AppError.badRequest('Cannot delete system folder');
        }

        await this.folderRepository.remove(folder);
        return { message: 'Folder deleted successfully' };
    }

    async createSystemFolders(userId: string) {
        await this.ensureInitialized();

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw AppError.notFound('User not found');
        }

        const systemFolderTypes = Object.values(SystemFolderType);
        const folders = systemFolderTypes.map(type => {
            return this.folderRepository.create({
                name: type,
                userId,
                type: 'system' as FolderType,
                systemType: type,
                color: '#808080',
                order: 0
            });
        });

        return await this.folderRepository.save(folders);
    }
} 