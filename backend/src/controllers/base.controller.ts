import { Request, Response, NextFunction } from 'express';
import { Repository, FindOptionsWhere, FindManyOptions, ObjectLiteral } from 'typeorm';
import { AppError } from '../utils/AppError';

export interface PaginationParams {
  page?: number;
  limit?: number;
  order?: Record<string, 'ASC' | 'DESC'>;
}

export interface FilterParams {
  [key: string]: any;
}

export class BaseController<T extends ObjectLiteral> {
  protected repository: Repository<T>;

  constructor(repository?: Repository<T>) {
    if (repository) {
      this.repository = repository;
    }
  }

  protected setRepository(repository: Repository<T>) {
    this.repository = repository;
  }

  protected async findAll(
    req: Request,
    res: Response,
    next: NextFunction,
    options: FindManyOptions<T> = {}
  ) {
    try {
      if (!this.repository) {
        throw new Error('Repository not initialized');
      }

      const { page = 1, limit = 10, order = {} } = req.query as PaginationParams;
      const skip = (page - 1) * limit;

      const [items, total] = await this.repository.findAndCount({
        ...options,
        skip,
        take: limit,
        order: order as any,
      });

      res.json({
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      next(error);
    }
  }

  protected async findOne(
    req: Request,
    res: Response,
    next: NextFunction,
    options: FindOptionsWhere<T> = {}
  ) {
    try {
      if (!this.repository) {
        throw new Error('Repository not initialized');
      }

      const { id } = req.params;
      const item = await this.repository.findOne({
        where: { id, ...options } as any,
      });

      if (!item) {
        throw AppError.notFound('Item not found');
      }

      res.json(item);
    } catch (error) {
      next(error);
    }
  }

  protected async create(
    req: Request,
    res: Response,
    next: NextFunction,
    data?: Partial<T>
  ) {
    try {
      if (!this.repository) {
        throw new Error('Repository not initialized');
      }

      const payload = data || req.body;
      const item = this.repository.create(payload);
      await this.repository.save(item);
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  }

  protected async update(
    req: Request,
    res: Response,
    next: NextFunction,
    options: FindOptionsWhere<T> = {}
  ) {
    try {
      if (!this.repository) {
        throw new Error('Repository not initialized');
      }

      const { id } = req.params;
      const item = await this.repository.findOne({
        where: { id, ...options } as any,
      });

      if (!item) {
        throw AppError.notFound('Item not found');
      }

      const updated = this.repository.merge(item, req.body);
      await this.repository.save(updated);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  protected async delete(
    req: Request,
    res: Response,
    next: NextFunction,
    options: FindOptionsWhere<T> = {}
  ) {
    try {
      if (!this.repository) {
        throw new Error('Repository not initialized');
      }

      const { id } = req.params;
      const item = await this.repository.findOne({
        where: { id, ...options } as any,
      });

      if (!item) {
        throw AppError.notFound('Item not found');
      }

      await this.repository.remove(item);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  protected async count(
    req: Request,
    res: Response,
    next: NextFunction,
    options: FindOptionsWhere<T> = {}
  ) {
    try {
      if (!this.repository) {
        throw new Error('Repository not initialized');
      }

      const count = await this.repository.count({
        where: options as any,
      });
      res.json({ count });
    } catch (error) {
      next(error);
    }
  }

  protected async exists(
    req: Request,
    res: Response,
    next: NextFunction,
    options: FindOptionsWhere<T> = {}
  ) {
    try {
      if (!this.repository) {
        throw new Error('Repository not initialized');
      }

      const exists = await this.repository.exist({
        where: options as any,
      });
      res.json({ exists });
    } catch (error) {
      next(error);
    }
  }
} 