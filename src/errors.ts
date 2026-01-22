/**
 * Custom error classes for Universal Command
 * P1-7: Exit code mapping for CLI commands
 */

/**
 * Standard exit codes (POSIX-compliant)
 */
export enum ExitCode {
  /** Success */
  SUCCESS = 0,
  /** General error */
  ERROR = 1,
  /** Misuse of shell command */
  MISUSE = 2,
  /** Invalid command usage */
  USAGE = 64,
  /** Data format error */
  DATA_ERROR = 65,
  /** Cannot open input */
  NO_INPUT = 66,
  /** User does not exist */
  NO_USER = 67,
  /** Host name unknown */
  NO_HOST = 68,
  /** Service unavailable */
  UNAVAILABLE = 69,
  /** Internal software error */
  SOFTWARE = 70,
  /** System error (e.g., can't fork) */
  OS_ERROR = 71,
  /** Critical OS file missing */
  OS_FILE = 72,
  /** Can't create (user) output file */
  CANT_CREATE = 73,
  /** Input/output error */
  IO_ERROR = 74,
  /** Temp failure; user is invited to retry */
  TEMP_FAIL = 75,
  /** Remote error in protocol */
  PROTOCOL = 76,
  /** Permission denied */
  NO_PERM = 77,
  /** Configuration error */
  CONFIG = 78,
  /** Timeout */
  TIMEOUT = 124,
  /** Terminated by signal */
  SIGNAL = 128,
}

/**
 * Base error for command execution failures
 * Includes exit code mapping for CLI execution
 */
export class CommandError extends Error {
  constructor(
    message: string,
    public readonly details?: {
      code?: string;
      status?: number;
      exitCode?: ExitCode;
      [key: string]: any;
    }
  ) {
    super(message);
    this.name = 'CommandError';
  }

  /**
   * Get exit code for CLI (defaults to ERROR if not specified)
   */
  getExitCode(): number {
    return this.details?.exitCode ?? this.details?.status ?? ExitCode.ERROR;
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
    super(message, {
      code: 'VALIDATION_ERROR',
      status: 400,
      exitCode: ExitCode.USAGE,
    });
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends CommandError {
  constructor(message: string = 'Authentication required') {
    super(message, {
      code: 'AUTHENTICATION_ERROR',
      status: 401,
      exitCode: ExitCode.NO_PERM,
    });
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends CommandError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, {
      code: 'AUTHORIZATION_ERROR',
      status: 403,
      exitCode: ExitCode.NO_PERM,
    });
    this.name = 'AuthorizationError';
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends CommandError {
  constructor(message: string = 'Operation timed out') {
    super(message, {
      code: 'TIMEOUT_ERROR',
      status: 504,
      exitCode: ExitCode.TIMEOUT,
    });
    this.name = 'TimeoutError';
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends CommandError {
  constructor(message: string) {
    super(message, {
      code: 'CONFIGURATION_ERROR',
      status: 500,
      exitCode: ExitCode.CONFIG,
    });
    this.name = 'ConfigurationError';
  }
}

/**
 * Not found error (resource doesn't exist)
 */
export class NotFoundError extends CommandError {
  constructor(message: string) {
    super(message, {
      code: 'NOT_FOUND',
      status: 404,
      exitCode: ExitCode.NO_INPUT,
    });
    this.name = 'NotFoundError';
  }
}
