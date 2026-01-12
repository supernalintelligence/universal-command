/**
 * Custom error classes for Universal Command
 */

/**
 * Base error for command execution failures
 */
export class CommandError extends Error {
  constructor(
    message: string,
    public readonly details?: {
      code?: string;
      status?: number;
      [key: string]: any;
    }
  ) {
    super(message);
    this.name = 'CommandError';
  }
}

/**
 * Validation error for invalid input
 */
export class ValidationError extends CommandError {
  constructor(
    message: string,
    public readonly errors: Array<{
      path: string;
      message: string;
    }>
  ) {
    super(message, { code: 'VALIDATION_ERROR', status: 400 });
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends CommandError {
  constructor(message: string = 'Authentication required') {
    super(message, { code: 'AUTHENTICATION_ERROR', status: 401 });
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends CommandError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, { code: 'AUTHORIZATION_ERROR', status: 403 });
    this.name = 'AuthorizationError';
  }
}
