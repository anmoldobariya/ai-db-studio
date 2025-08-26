// src/main/utils/error-handler.ts

import log from 'electron-log';

export enum ErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  QUERY_ERROR = 'QUERY_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  FILE_ERROR = 'FILE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXPORT_ERROR = 'EXPORT_ERROR',
  IMPORT_ERROR = 'IMPORT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
  code?: string;
  retryable?: boolean;
  timestamp: string;
  context?: Record<string, any>;
}

export class ErrorHandler {
  static createError(
    type: ErrorType,
    message: string,
    details?: string,
    code?: string,
    retryable = false,
    context?: Record<string, any>
  ): AppError {
    return {
      type,
      message,
      details,
      code,
      retryable,
      timestamp: new Date().toISOString(),
      context
    };
  }

  static handleDatabaseError(error: any, context?: Record<string, any>): AppError {
    log.error('Database error:', error, context);

    // MySQL specific errors
    if (error.code) {
      switch (error.code) {
        case 'ER_ACCESS_DENIED_ERROR':
        case 'ER_DBACCESS_DENIED_ERROR':
          return this.createError(
            ErrorType.AUTHENTICATION_ERROR,
            'Database access denied. Please check your credentials.',
            error.message,
            error.code,
            false,
            context
          );
        case 'ER_BAD_DB_ERROR':
          return this.createError(
            ErrorType.DATABASE_ERROR,
            'Database does not exist or is not accessible.',
            error.message,
            error.code,
            false,
            context
          );
        case 'ECONNREFUSED':
        case 'ENOTFOUND':
        case 'ETIMEDOUT':
          return this.createError(
            ErrorType.CONNECTION_ERROR,
            'Cannot connect to database server. Please check your connection settings.',
            error.message,
            error.code,
            true,
            context
          );
        case 'ER_PARSE_ERROR':
        case 'ER_SYNTAX_ERROR':
          return this.createError(
            ErrorType.QUERY_ERROR,
            'SQL syntax error in your query.',
            error.message,
            error.code,
            false,
            context
          );
      }
    }

    // PostgreSQL specific errors
    if (error.code && error.code.startsWith('28')) {
      return this.createError(
        ErrorType.AUTHENTICATION_ERROR,
        'PostgreSQL authentication failed. Please check your credentials.',
        error.message,
        error.code,
        false,
        context
      );
    }

    // SQLite specific errors
    if (error.message?.includes('SQLITE_')) {
      if (error.message.includes('SQLITE_CANTOPEN')) {
        return this.createError(
          ErrorType.FILE_ERROR,
          'Cannot open SQLite database file. Please check the file path and permissions.',
          error.message,
          'SQLITE_CANTOPEN',
          false,
          context
        );
      }
      if (error.message.includes('SQLITE_LOCKED')) {
        return this.createError(
          ErrorType.DATABASE_ERROR,
          'Database is locked. Please try again later.',
          error.message,
          'SQLITE_LOCKED',
          true,
          context
        );
      }
    }

    // MongoDB specific errors
    if (error.name === 'MongoServerError') {
      if (error.code === 18) {
        return this.createError(
          ErrorType.AUTHENTICATION_ERROR,
          'MongoDB authentication failed. Please check your credentials.',
          error.message,
          error.code.toString(),
          false,
          context
        );
      }
    }

    // Generic network/connection errors
    if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
      return this.createError(
        ErrorType.TIMEOUT_ERROR,
        'Connection timeout. Please check your network connection.',
        error.message,
        error.code,
        true,
        context
      );
    }

    // Generic connection errors
    if (error.message?.includes('connect') || error.code === 'ECONNREFUSED') {
      return this.createError(
        ErrorType.CONNECTION_ERROR,
        'Failed to connect to database. Please check your connection settings.',
        error.message,
        error.code,
        true,
        context
      );
    }

    // Default database error
    return this.createError(
      ErrorType.DATABASE_ERROR,
      error.message || 'An unexpected database error occurred.',
      error.stack,
      error.code,
      false,
      context
    );
  }

  static handleFileError(error: any, context?: Record<string, any>): AppError {
    log.error('File error:', error, context);

    if (error.code === 'ENOENT') {
      return this.createError(
        ErrorType.FILE_ERROR,
        'File not found.',
        error.message,
        error.code,
        false,
        context
      );
    }

    if (error.code === 'EACCES' || error.code === 'EPERM') {
      return this.createError(
        ErrorType.FILE_ERROR,
        'Permission denied. Please check file permissions.',
        error.message,
        error.code,
        false,
        context
      );
    }

    return this.createError(
      ErrorType.FILE_ERROR,
      error.message || 'File operation failed.',
      error.stack,
      error.code,
      false,
      context
    );
  }

  static handleValidationError(message: string, details?: string, context?: Record<string, any>): AppError {
    return this.createError(
      ErrorType.VALIDATION_ERROR,
      message,
      details,
      undefined,
      false,
      context
    );
  }

  static handleEncryptionError(error: any, context?: Record<string, any>): AppError {
    log.error('Encryption error:', error, context);

    return this.createError(
      ErrorType.ENCRYPTION_ERROR,
      'Failed to encrypt/decrypt data. Please check your encryption key.',
      error.message,
      error.code,
      false,
      context
    );
  }

  static handleUnknownError(error: any, context?: Record<string, any>): AppError {
    log.error('Unknown error:', error, context);

    return this.createError(
      ErrorType.UNKNOWN_ERROR,
      error.message || 'An unexpected error occurred.',
      error.stack,
      error.code,
      false,
      context
    );
  }

  static formatErrorResponse(error: AppError) {
    return {
      success: false,
      error: error.message,
      errorType: error.type,
      errorCode: error.code,
      retryable: error.retryable,
      details: error.details,
      timestamp: error.timestamp
    };
  }

  static formatSuccessResponse<T>(data: T, message?: string) {
    return {
      success: true,
      ...data,
      message,
      timestamp: new Date().toISOString()
    };
  }
}