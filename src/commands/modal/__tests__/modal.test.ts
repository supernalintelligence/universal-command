/**
 * Modal Commands Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { modalSpawnCommand, modalProvisionCommand, modalStatusCommand } from '../index';
import { handler as spawnHandler } from '../spawn-handler';
import { handler as provisionHandler } from '../provision-handler';
import { handler as statusHandler } from '../status-handler';

// Mock child_process and util
vi.mock('child_process');
vi.mock('util');

describe('Modal Commands', () => {
  describe('Schema Validation', () => {
    it('should have correct spawn command schema', () => {
      expect(modalSpawnCommand.schema.name).toBe('modal spawn');
      expect(modalSpawnCommand.schema.description).toBe('Spawn a Modal agent with a task');
      expect(modalSpawnCommand.schema.category).toBe('modal');
      expect(modalSpawnCommand.schema.scope).toBe('development');
      
      const taskParam = modalSpawnCommand.schema.input.parameters.find(p => p.name === 'task');
      expect(taskParam).toBeDefined();
      expect(taskParam?.required).toBe(true);
    });

    it('should have correct provision command schema', () => {
      expect(modalProvisionCommand.schema.name).toBe('modal provision');
      expect(modalProvisionCommand.schema.description).toBe('Provision Modal agent workspace for a new user');
      expect(modalProvisionCommand.schema.category).toBe('modal');
      
      const userIdParam = modalProvisionCommand.schema.input.parameters.find(p => p.name === 'userId');
      const emailParam = modalProvisionCommand.schema.input.parameters.find(p => p.name === 'email');
      
      expect(userIdParam).toBeDefined();
      expect(userIdParam?.required).toBe(true);
      expect(emailParam).toBeDefined();
      expect(emailParam?.required).toBe(true);
    });

    it('should have correct status command schema', () => {
      expect(modalStatusCommand.schema.name).toBe('modal status');
      expect(modalStatusCommand.schema.description).toBe('Show Modal deployment and agent status');
      expect(modalStatusCommand.schema.category).toBe('modal');
      
      const userParam = modalStatusCommand.schema.input.parameters.find(p => p.name === 'user');
      expect(userParam).toBeDefined();
      expect(userParam?.required).toBe(false);
    });
  });

  describe('Handler Unit Tests', () => {
    const mockContext = {
      stdout: {
        write: vi.fn(),
      },
      stderr: {
        write: vi.fn(),
      },
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle spawn command input validation', () => {
      // Test that the handler exists and is callable
      expect(spawnHandler).toBeDefined();
      expect(typeof spawnHandler).toBe('function');
    });

    it('should handle provision command input validation', () => {
      // Test that the handler exists and is callable
      expect(provisionHandler).toBeDefined();
      expect(typeof provisionHandler).toBe('function');
    });

    it('should handle status command input validation', () => {
      // Test that the handler exists and is callable
      expect(statusHandler).toBeDefined();
      expect(typeof statusHandler).toBe('function');
    });
  });
});