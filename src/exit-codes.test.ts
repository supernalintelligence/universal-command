/**
 * Tests for P1-7: Exit Code Mapping
 */

import { describe, it, expect } from 'vitest';
import {
  CommandError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  TimeoutError,
  ConfigurationError,
  NotFoundError,
  ExitCode,
} from './errors';

describe('P1-7: Exit Code Mapping', () => {
  it('should define standard POSIX exit codes', () => {
    expect(ExitCode.SUCCESS).toBe(0);
    expect(ExitCode.ERROR).toBe(1);
    expect(ExitCode.MISUSE).toBe(2);
    expect(ExitCode.USAGE).toBe(64);
    expect(ExitCode.DATA_ERROR).toBe(65);
    expect(ExitCode.NO_INPUT).toBe(66);
    expect(ExitCode.NO_PERM).toBe(77);
    expect(ExitCode.CONFIG).toBe(78);
    expect(ExitCode.TIMEOUT).toBe(124);
    expect(ExitCode.SIGNAL).toBe(128);
  });

  it('should provide getExitCode() method on CommandError', () => {
    const error = new CommandError('Test error');
    expect(error.getExitCode).toBeDefined();
    expect(typeof error.getExitCode).toBe('function');
  });

  it('should default to ERROR exit code when none specified', () => {
    const error = new CommandError('Test error');
    expect(error.getExitCode()).toBe(ExitCode.ERROR);
  });

  it('should use explicit exitCode when provided', () => {
    const error = new CommandError('Test error', {
      exitCode: ExitCode.CONFIG,
    });
    expect(error.getExitCode()).toBe(ExitCode.CONFIG);
  });

  it('should fall back to status code when exitCode not provided', () => {
    const error = new CommandError('Test error', {
      status: 404,
    });
    expect(error.getExitCode()).toBe(404);
  });

  it('should prioritize exitCode over status', () => {
    const error = new CommandError('Test error', {
      status: 500,
      exitCode: ExitCode.TIMEOUT,
    });
    expect(error.getExitCode()).toBe(ExitCode.TIMEOUT);
  });

  it('ValidationError should use USAGE exit code', () => {
    const error = new ValidationError('Invalid input', [
      { path: 'field', message: 'required' },
    ]);
    expect(error.getExitCode()).toBe(ExitCode.USAGE);
  });

  it('AuthenticationError should use NO_PERM exit code', () => {
    const error = new AuthenticationError();
    expect(error.getExitCode()).toBe(ExitCode.NO_PERM);
  });

  it('AuthorizationError should use NO_PERM exit code', () => {
    const error = new AuthorizationError();
    expect(error.getExitCode()).toBe(ExitCode.NO_PERM);
  });

  it('TimeoutError should use TIMEOUT exit code', () => {
    const error = new TimeoutError();
    expect(error.getExitCode()).toBe(ExitCode.TIMEOUT);
  });

  it('ConfigurationError should use CONFIG exit code', () => {
    const error = new ConfigurationError('Invalid config');
    expect(error.getExitCode()).toBe(ExitCode.CONFIG);
  });

  it('NotFoundError should use NO_INPUT exit code', () => {
    const error = new NotFoundError('File not found');
    expect(error.getExitCode()).toBe(ExitCode.NO_INPUT);
  });

  it('should support custom exit codes for specific errors', () => {
    const customError = new CommandError('Custom error', {
      code: 'CUSTOM_ERROR',
      exitCode: ExitCode.DATA_ERROR,
    });
    expect(customError.getExitCode()).toBe(ExitCode.DATA_ERROR);
  });

  it('should preserve error message and details', () => {
    const error = new ValidationError('Validation failed', [
      { path: 'email', message: 'Invalid format' },
      { path: 'password', message: 'Too short' },
    ]);

    expect(error.message).toBe('Validation failed');
    expect(error.errors).toHaveLength(2);
    expect(error.errors[0].path).toBe('email');
    expect(error.details?.code).toBe('VALIDATION_ERROR');
  });

  it('should support error chaining and context', () => {
    const error = new CommandError('Operation failed', {
      code: 'OP_FAILED',
      exitCode: ExitCode.SOFTWARE,
      context: {
        operation: 'git commit',
        reason: 'Nothing to commit',
      },
    });

    expect(error.getExitCode()).toBe(ExitCode.SOFTWARE);
    expect(error.details?.context.operation).toBe('git commit');
  });
});

describe('P1-7: CLI Integration', () => {
  it('should extract exit code from CommandError in CLI action handler', () => {
    const error = new ValidationError('Invalid args', [
      { path: 'required', message: 'Missing field' },
    ]);

    // Simulate CLI error handler logic
    const exitCode = error.getExitCode
      ? error.getExitCode()
      : error.details?.exitCode ?? error.details?.status ?? 1;

    expect(exitCode).toBe(ExitCode.USAGE);
  });

  it('should handle non-CommandError exceptions gracefully', () => {
    const error = new Error('Regular error');

    // Simulate CLI error handler with regular Error
    const anyError = error as any;
    const exitCode = anyError.getExitCode
      ? anyError.getExitCode()
      : anyError.details?.exitCode ?? anyError.details?.status ?? 1;

    expect(exitCode).toBe(1); // Falls back to 1
  });

  it('should support exit code in error details for backward compatibility', () => {
    const error = new CommandError('Legacy error', {
      status: 500, // Old API-style status
    });

    const exitCode = error.getExitCode();
    expect(exitCode).toBe(500); // Falls back to status
  });
});
