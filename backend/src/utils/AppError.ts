export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: string;
  public readonly isOperational: boolean;
  public readonly errors?: any[];

  constructor(message: string, statusCode: number, errors?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, errors?: any[]) {
    return new AppError(message, 400, errors);
  }

  static unauthorized(message: string = 'Unauthorized', errors?: any[]) {
    return new AppError(message, 401, errors);
  }

  static forbidden(message: string = 'Forbidden', errors?: any[]) {
    return new AppError(message, 403, errors);
  }

  static notFound(message: string = 'Not found', errors?: any[]) {
    return new AppError(message, 404, errors);
  }

  static conflict(message: string, errors?: any[]): AppError {
    return new AppError(message, 409, errors);
  }

  static validationError(message: string, errors?: any[]): AppError {
    return new AppError(message, 422, errors);
  }

  static internal(message: string = 'Internal server error', errors?: any[]) {
    return new AppError(message, 500, errors);
  }
} 