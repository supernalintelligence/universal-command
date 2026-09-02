import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UniversalCommand, setTenancyGuard, getTenancyGuard } from './UniversalCommand';
import { ValidationError } from './errors';
import type { MCPCallExtra } from './types';

describe('UniversalCommand', () => {
  describe('constructor', () => {
    it('should create a command with valid schema', () => {
      const cmd = new UniversalCommand({
        name: 'test',
        description: 'Test command',
        input: { parameters: [] },
        output: { type: 'json' },
        handler: async () => ({ success: true }),
      });

      expect(cmd.schema.name).toBe('test');
      expect(cmd.schema.description).toBe('Test command');
    });

    it('should throw error when name is missing', () => {
      expect(() => {
        new UniversalCommand({
          name: '',
          description: 'Test',
          input: { parameters: [] },
          output: { type: 'json' },
          handler: async () => ({}),
        });
      }).toThrow('Command name is required');
    });

    it('should throw error when description is missing', () => {
      expect(() => {
        new UniversalCommand({
          name: 'test',
          description: '',
          input: { parameters: [] },
          output: { type: 'json' },
          handler: async () => ({}),
        });
      }).toThrow('Command description is required');
    });

    it('should throw error when handler is missing', () => {
      expect(() => {
        new UniversalCommand({
          name: 'test',
          description: 'Test',
          input: { parameters: [] },
          output: { type: 'json' },
          handler: undefined as any,
        });
      }).toThrow('Command handler is required');
    });
  });

  describe('execute', () => {
    it('should execute handler with valid arguments', async () => {
      const cmd = new UniversalCommand({
        name: 'greet',
        description: 'Greet user',
        input: {
          parameters: [
            { name: 'name', type: 'string', required: true, description: 'Name to greet' },
          ],
        },
        output: { type: 'text' },
        handler: async (args) => `Hello, ${args.name}!`,
      });

      const result = await cmd.execute({ name: 'World' }, { interface: 'cli' });
      expect(result).toBe('Hello, World!');
    });

    it('should throw ValidationError for missing required parameters', async () => {
      const cmd = new UniversalCommand({
        name: 'greet',
        description: 'Greet user',
        input: {
          parameters: [{ name: 'name', type: 'string', required: true, description: 'Name' }],
        },
        output: { type: 'text' },
        handler: async (args) => `Hello, ${args.name}!`,
      });

      await expect(cmd.execute({}, { interface: 'cli' })).rejects.toThrow(ValidationError);
    });

    it('should use default values for optional parameters', async () => {
      const cmd = new UniversalCommand({
        name: 'greet',
        description: 'Greet user',
        input: {
          parameters: [{ name: 'name', type: 'string', default: 'World', description: 'Name' }],
        },
        output: { type: 'text' },
        handler: async (args) => `Hello, ${args.name}!`,
      });

      const result = await cmd.execute({}, { interface: 'cli' });
      expect(result).toBe('Hello, World!');
    });
  });

  describe('validateArgs', () => {
    it('should validate string type', () => {
      const cmd = new UniversalCommand({
        name: 'test',
        description: 'Test',
        input: {
          parameters: [{ name: 'value', type: 'string', description: 'Value' }],
        },
        output: { type: 'json' },
        handler: async () => ({}),
      });

      expect(cmd.validateArgs({ value: 'hello' }).valid).toBe(true);
      expect(cmd.validateArgs({ value: 123 }).valid).toBe(false);
    });

    it('should validate number type', () => {
      const cmd = new UniversalCommand({
        name: 'test',
        description: 'Test',
        input: {
          parameters: [{ name: 'value', type: 'number', description: 'Value' }],
        },
        output: { type: 'json' },
        handler: async () => ({}),
      });

      expect(cmd.validateArgs({ value: 42 }).valid).toBe(true);
      expect(cmd.validateArgs({ value: 'not-a-number' }).valid).toBe(false);
    });

    it('should validate boolean type', () => {
      const cmd = new UniversalCommand({
        name: 'test',
        description: 'Test',
        input: {
          parameters: [{ name: 'value', type: 'boolean', description: 'Value' }],
        },
        output: { type: 'json' },
        handler: async () => ({}),
      });

      expect(cmd.validateArgs({ value: true }).valid).toBe(true);
      expect(cmd.validateArgs({ value: false }).valid).toBe(true);
      expect(cmd.validateArgs({ value: 'true' }).valid).toBe(false);
    });

    it('should validate array type', () => {
      const cmd = new UniversalCommand({
        name: 'test',
        description: 'Test',
        input: {
          parameters: [{ name: 'value', type: 'array', description: 'Value' }],
        },
        output: { type: 'json' },
        handler: async () => ({}),
      });

      expect(cmd.validateArgs({ value: [1, 2, 3] }).valid).toBe(true);
      expect(cmd.validateArgs({ value: 'not-array' }).valid).toBe(false);
    });

    it('should validate object type', () => {
      const cmd = new UniversalCommand({
        name: 'test',
        description: 'Test',
        input: {
          parameters: [{ name: 'value', type: 'object', description: 'Value' }],
        },
        output: { type: 'json' },
        handler: async () => ({}),
      });

      expect(cmd.validateArgs({ value: { key: 'value' } }).valid).toBe(true);
      expect(cmd.validateArgs({ value: [1, 2] }).valid).toBe(false);
      expect(cmd.validateArgs({ value: null }).valid).toBe(false);
    });

    it('should validate enum values', () => {
      const cmd = new UniversalCommand({
        name: 'test',
        description: 'Test',
        input: {
          parameters: [
            { name: 'role', type: 'string', enum: ['admin', 'user'], description: 'Role' },
          ],
        },
        output: { type: 'json' },
        handler: async () => ({}),
      });

      expect(cmd.validateArgs({ role: 'admin' }).valid).toBe(true);
      expect(cmd.validateArgs({ role: 'invalid' }).valid).toBe(false);
    });

    it('should validate number min/max', () => {
      const cmd = new UniversalCommand({
        name: 'test',
        description: 'Test',
        input: {
          parameters: [{ name: 'count', type: 'number', min: 1, max: 100, description: 'Count' }],
        },
        output: { type: 'json' },
        handler: async () => ({}),
      });

      expect(cmd.validateArgs({ count: 50 }).valid).toBe(true);
      expect(cmd.validateArgs({ count: 0 }).valid).toBe(false);
      expect(cmd.validateArgs({ count: 101 }).valid).toBe(false);
    });

    it('should validate string pattern', () => {
      const cmd = new UniversalCommand({
        name: 'test',
        description: 'Test',
        input: {
          parameters: [
            {
              name: 'email',
              type: 'string',
              pattern: '^[^@]+@[^@]+\\.[^@]+$',
              description: 'Email',
            },
          ],
        },
        output: { type: 'json' },
        handler: async () => ({}),
      });

      expect(cmd.validateArgs({ email: 'test@example.com' }).valid).toBe(true);
      expect(cmd.validateArgs({ email: 'not-an-email' }).valid).toBe(false);
    });
  });

  describe('getAPIRoutePath', () => {
    it('should convert command name to API path', () => {
      const cmd = new UniversalCommand({
        name: 'user list',
        description: 'List users',
        input: { parameters: [] },
        output: { type: 'json' },
        handler: async () => [],
      });

      expect(cmd.getAPIRoutePath()).toBe('user/list');
    });
  });

  describe('getMCPToolName', () => {
    it('should generate default MCP tool name', () => {
      const cmd = new UniversalCommand({
        name: 'user list',
        description: 'List users',
        input: { parameters: [] },
        output: { type: 'json' },
        handler: async () => [],
      });

      expect(cmd.getMCPToolName()).toBe('sc_user_list');
    });

    it('should use custom MCP tool name if provided', () => {
      const cmd = new UniversalCommand({
        name: 'user list',
        description: 'List users',
        input: { parameters: [] },
        output: { type: 'json' },
        handler: async () => [],
        mcp: { toolName: 'custom_list_users' },
      });

      expect(cmd.getMCPToolName()).toBe('custom_list_users');
    });
  });

  describe('toMCP', () => {
    it('should generate valid MCP tool definition', () => {
      const cmd = new UniversalCommand({
        name: 'user list',
        description: 'List all users',
        input: {
          parameters: [
            {
              name: 'role',
              type: 'string',
              enum: ['admin', 'user'],
              description: 'Filter by role',
            },
            {
              name: 'limit',
              type: 'number',
              default: 10,
              min: 1,
              max: 100,
              description: 'Max results',
            },
          ],
        },
        output: { type: 'json' },
        handler: async () => [],
      });

      const mcpTool = cmd.toMCP();

      expect(mcpTool.name).toBe('sc_user_list');
      expect(mcpTool.description).toBe('List all users');
      expect(mcpTool.inputSchema.type).toBe('object');
      expect(mcpTool.inputSchema.properties.role.enum).toEqual(['admin', 'user']);
      expect(mcpTool.inputSchema.properties.limit.minimum).toBe(1);
      expect(mcpTool.inputSchema.properties.limit.maximum).toBe(100);
      expect(typeof mcpTool.execute).toBe('function');
    });

    it('should execute MCP tool and return result', async () => {
      const cmd = new UniversalCommand({
        name: 'echo',
        description: 'Echo message',
        input: {
          parameters: [{ name: 'message', type: 'string', required: true, description: 'Message' }],
        },
        output: { type: 'text' },
        handler: async (args) => ({ echoed: args.message }),
      });

      const mcpTool = cmd.toMCP();
      const result = await mcpTool.execute({ message: 'hello' });

      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text)).toEqual({ echoed: 'hello' });
    });

    it('passes extra.sessionId through to the handler as context.sessionId', async () => {
      let receivedSessionId: string | undefined;
      const cmd = new UniversalCommand({
        name: 'session-echo',
        description: 'Echo session id',
        input: { parameters: [] },
        output: { type: 'json' },
        handler: async (_args, context) => {
          receivedSessionId = context.sessionId;
          return { ok: true };
        },
      });

      await cmd.toMCP().execute({}, { sessionId: 'session-123' });

      expect(receivedSessionId).toBe('session-123');
    });

    it('does not set context.sessionId when extra is omitted', async () => {
      let receivedSessionId: string | undefined = 'sentinel';
      const cmd = new UniversalCommand({
        name: 'session-echo-2',
        description: 'Echo session id',
        input: { parameters: [] },
        output: { type: 'json' },
        handler: async (_args, context) => {
          receivedSessionId = context.sessionId;
          return { ok: true };
        },
      });

      await cmd.toMCP().execute({});

      expect(receivedSessionId).toBeUndefined();
    });

    describe('streaming (output.type: "stream")', () => {
      function buildProgressExtra(): {
        extra: MCPCallExtra;
        notifications: Array<Record<string, unknown>>;
      } {
        const notifications: Array<Record<string, unknown>> = [];
        const extra: MCPCallExtra = {
          meta: { progressToken: 'tok-1' },
          sendNotification: async (notification) => {
            notifications.push(notification.params ?? {});
          },
        };
        return { extra, notifications };
      }

      it('emits a real progress notification per chunk written to context.stream', async () => {
        const cmd = new UniversalCommand({
          name: 'stream-cmd',
          description: 'Streams chunks',
          input: { parameters: [] },
          output: { type: 'stream' },
          handler: async (_args, context) => {
            context.stream!.write('chunk-one');
            context.stream!.write('chunk-two');
            return { done: true };
          },
        });

        const { extra, notifications } = buildProgressExtra();
        const result = await cmd.toMCP().execute({}, extra);

        expect(notifications).toHaveLength(2);
        expect(notifications[0]).toMatchObject({
          progressToken: 'tok-1',
          progress: 1,
          message: 'chunk-one',
        });
        expect(notifications[1]).toMatchObject({
          progressToken: 'tok-1',
          progress: 2,
          message: 'chunk-two',
        });
        // The final envelope is unaffected — still one JSON result, same as
        // the non-streaming case.
        expect(JSON.parse(result.content[0].text)).toEqual({ done: true });
      });

      it('provides a no-op context.stream (writable, but silent) when no progressToken is supplied', async () => {
        let sawStream = false;
        const cmd = new UniversalCommand({
          name: 'stream-cmd-no-token',
          description: 'Streams chunks',
          input: { parameters: [] },
          output: { type: 'stream' },
          handler: async (_args, context) => {
            sawStream = context.stream !== undefined;
            // A streaming handler can always write unconditionally — no
            // "if (context.stream)" guard needed even with no progress
            // capability on this call.
            context.stream!.write('ignored-chunk');
            return { done: true };
          },
        });

        // sendNotification present, but no progressToken in meta.
        const sent = vi.fn(async () => {});
        const result = await cmd.toMCP().execute({}, { sendNotification: sent });

        expect(sawStream).toBe(true);
        expect(sent).not.toHaveBeenCalled();
        expect(JSON.parse(result.content[0].text)).toEqual({ done: true });
      });

      it('provides a no-op context.stream when the caller supplies no extra at all', async () => {
        let sawStream = false;
        const cmd = new UniversalCommand({
          name: 'stream-cmd-no-extra',
          description: 'Streams chunks',
          input: { parameters: [] },
          output: { type: 'stream' },
          handler: async (_args, context) => {
            sawStream = context.stream !== undefined;
            context.stream!.write('ignored-chunk');
            return { done: true };
          },
        });

        const result = await cmd.toMCP().execute({});

        expect(sawStream).toBe(true);
        expect(JSON.parse(result.content[0].text)).toEqual({ done: true });
      });

      it('does not wire context.stream for a non-streaming command even with a full progress extra', async () => {
        let sawStream = false;
        const cmd = new UniversalCommand({
          name: 'non-stream-cmd',
          description: 'Not a streaming command',
          input: { parameters: [] },
          output: { type: 'json' },
          handler: async (_args, context) => {
            sawStream = context.stream !== undefined;
            return { done: true };
          },
        });

        const { extra, notifications } = buildProgressExtra();
        const result = await cmd.toMCP().execute({}, extra);

        expect(sawStream).toBe(false);
        expect(notifications).toHaveLength(0);
        expect(JSON.parse(result.content[0].text)).toEqual({ done: true });
      });
    });
  });

  describe('toCLI — session pass-through', () => {
    const ORIGINAL_SESSION_ID = process.env.SC_SESSION_ID;

    beforeEach(() => {
      delete process.env.SC_SESSION_ID;
    });

    afterEach(() => {
      if (ORIGINAL_SESSION_ID === undefined) {
        delete process.env.SC_SESSION_ID;
      } else {
        process.env.SC_SESSION_ID = ORIGINAL_SESSION_ID;
      }
    });

    it('sets context.sessionId from SC_SESSION_ID when set', async () => {
      let receivedSessionId: string | undefined;
      const cmd = new UniversalCommand({
        name: 'cli-session-test',
        description: 'Test CLI session pass-through',
        input: { parameters: [] },
        output: { type: 'text' },
        handler: async (_args, context) => {
          receivedSessionId = context.sessionId;
          return 'done';
        },
      });

      process.env.SC_SESSION_ID = 'cli-session-abc';
      const cliCmd = cmd.toCLI();
      await cliCmd.parseAsync(['node', 'cli-session-test'], { from: 'node' });

      expect(receivedSessionId).toBe('cli-session-abc');
    });

    it('leaves context.sessionId undefined when SC_SESSION_ID is unset', async () => {
      let receivedSessionId: string | undefined = 'sentinel';
      const cmd = new UniversalCommand({
        name: 'cli-session-test-2',
        description: 'Test CLI session pass-through',
        input: { parameters: [] },
        output: { type: 'text' },
        handler: async (_args, context) => {
          receivedSessionId = context.sessionId;
          return 'done';
        },
      });

      const cliCmd = cmd.toCLI();
      await cliCmd.parseAsync(['node', 'cli-session-test-2'], { from: 'node' });

      expect(receivedSessionId).toBeUndefined();
    });
  });

  describe('toNextAPI — session pass-through', () => {
    it('sets context.sessionId from an x-session-id header (Headers-style request)', async () => {
      let receivedSessionId: string | undefined;
      const cmd = new UniversalCommand({
        name: 'api-session-test',
        description: 'Test API session pass-through',
        input: { parameters: [] },
        output: { type: 'json' },
        api: { method: 'GET' },
        handler: async (_args, context) => {
          receivedSessionId = context.sessionId;
          return { ok: true };
        },
      });

      const route = cmd.toNextAPI();
      const headerMap = new Map([['x-session-id', 'api-session-xyz']]);
      const fakeRequest = {
        method: 'GET',
        headers: { get: (key: string) => headerMap.get(key.toLowerCase()) ?? null },
        nextUrl: { searchParams: new URLSearchParams() },
      };

      await route.GET!(fakeRequest as any);

      expect(receivedSessionId).toBe('api-session-xyz');
    });

    it('leaves context.sessionId undefined when no session header is sent', async () => {
      let receivedSessionId: string | undefined = 'sentinel';
      const cmd = new UniversalCommand({
        name: 'api-session-test-2',
        description: 'Test API session pass-through',
        input: { parameters: [] },
        output: { type: 'json' },
        api: { method: 'GET' },
        handler: async (_args, context) => {
          receivedSessionId = context.sessionId;
          return { ok: true };
        },
      });

      const route = cmd.toNextAPI();
      const fakeRequest = {
        method: 'GET',
        headers: { get: () => null },
        nextUrl: { searchParams: new URLSearchParams() },
      };

      await route.GET!(fakeRequest as any);

      expect(receivedSessionId).toBeUndefined();
    });

    it('passes an in-process session store through as context.session when present on the request', async () => {
      let receivedSession: unknown;
      const cmd = new UniversalCommand({
        name: 'api-session-test-3',
        description: 'Test API session store pass-through',
        input: { parameters: [] },
        output: { type: 'json' },
        api: { method: 'GET' },
        handler: async (_args, context) => {
          receivedSession = context.session;
          return { ok: true };
        },
      });

      const store = { get: vi.fn(), set: vi.fn() };
      const route = cmd.toNextAPI();
      const fakeRequest = {
        method: 'GET',
        headers: { get: () => null },
        nextUrl: { searchParams: new URLSearchParams() },
        session: store,
      };

      await route.GET!(fakeRequest as any);

      expect(receivedSession).toBe(store);
    });
  });
});

describe('tenancy guard (REQ-STC-101/102)', () => {
  afterEach(() => {
    setTenancyGuard(null);
  });

  it('runs no check when the command declares no tenancy schema, even with a guard registered', async () => {
    const guard = vi.fn().mockReturnValue({ allowed: false, reason: 'should never be called' });
    setTenancyGuard(guard);

    const cmd = new UniversalCommand({
      name: 'no-tenancy',
      description: 'No tenancy declared',
      input: { parameters: [{ name: 'company', type: 'string', required: true }] },
      output: { type: 'json' },
      handler: async (args) => ({ company: args.company }),
    });

    const result = await cmd.execute({ company: 'acme' } as any, { interface: 'test' });
    expect(result).toEqual({ company: 'acme' });
    expect(guard).not.toHaveBeenCalled();
  });

  it('runs no check when the command declares tenancy but no guard is registered', async () => {
    setTenancyGuard(null);
    expect(getTenancyGuard()).toBeNull();

    const cmd = new UniversalCommand({
      name: 'tenancy-no-guard',
      description: 'Tenancy declared, no host guard registered',
      input: { parameters: [{ name: 'company', type: 'string', required: true }] },
      output: { type: 'json' },
      tenancy: { companyParam: 'company' },
      handler: async (args) => ({ company: args.company }),
    });

    const result = await cmd.execute({ company: 'acme' } as any, { interface: 'test' });
    expect(result).toEqual({ company: 'acme' });
  });

  it('calls the guard with the resolved company param and allows on a positive decision', async () => {
    const guard = vi.fn().mockReturnValue({ allowed: true });
    setTenancyGuard(guard);

    const cmd = new UniversalCommand({
      name: 'tenancy-allow',
      description: 'Tenancy check passes',
      input: { parameters: [{ name: 'companySlug', type: 'string', required: true }] },
      output: { type: 'json' },
      tenancy: { companyParam: 'companySlug' },
      handler: async (args) => ({ ok: true, companySlug: args.companySlug }),
    });

    const context = { interface: 'cli' as const, sessionId: 'sess-1' };
    const result = await cmd.execute({ companySlug: 'acme' } as any, context);

    expect(result).toEqual({ ok: true, companySlug: 'acme' });
    expect(guard).toHaveBeenCalledWith('acme', context);
  });

  it('throws AuthorizationError and never invokes the handler on a negative decision', async () => {
    setTenancyGuard(() => ({
      allowed: false,
      reason: "session locked to 'other-co', requested 'acme'",
    }));

    const handler = vi.fn().mockResolvedValue({ ok: true });
    const cmd = new UniversalCommand({
      name: 'tenancy-deny',
      description: 'Tenancy check fails',
      input: { parameters: [{ name: 'companySlug', type: 'string', required: true }] },
      output: { type: 'json' },
      tenancy: { companyParam: 'companySlug' },
      handler,
    });

    await expect(cmd.execute({ companySlug: 'acme' } as any, { interface: 'cli' })).rejects.toThrow(
      "session locked to 'other-co', requested 'acme'"
    );
    expect(handler).not.toHaveBeenCalled();
  });

  it('falls back to a generic message when the guard omits a reason', async () => {
    setTenancyGuard(() => ({ allowed: false }));

    const cmd = new UniversalCommand({
      name: 'tenancy-deny-no-reason',
      description: 'Tenancy check fails with no reason',
      input: { parameters: [{ name: 'companySlug', type: 'string', required: true }] },
      output: { type: 'json' },
      tenancy: { companyParam: 'companySlug' },
      handler: async () => ({ ok: true }),
    });

    await expect(cmd.execute({ companySlug: 'acme' } as any, { interface: 'cli' })).rejects.toThrow(
      /not authorized for company 'acme'/
    );
  });

  it('supports an async guard function', async () => {
    setTenancyGuard(async (company) => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return { allowed: company === 'allowed-co' };
    });

    const cmd = new UniversalCommand({
      name: 'tenancy-async',
      description: 'Async guard',
      input: { parameters: [{ name: 'companySlug', type: 'string', required: true }] },
      output: { type: 'json' },
      tenancy: { companyParam: 'companySlug' },
      handler: async () => ({ ok: true }),
    });

    await expect(
      cmd.execute({ companySlug: 'allowed-co' } as any, { interface: 'cli' })
    ).resolves.toEqual({ ok: true });
    await expect(
      cmd.execute({ companySlug: 'blocked-co' } as any, { interface: 'cli' })
    ).rejects.toThrow(/not authorized/);
  });

  it('runs the tenancy check for validated data even after default-fill (companyParam picked up post-validation)', async () => {
    const guard = vi.fn().mockReturnValue({ allowed: true });
    setTenancyGuard(guard);

    const cmd = new UniversalCommand({
      name: 'tenancy-default',
      description: 'Default-filled company param',
      input: {
        parameters: [
          { name: 'companySlug', type: 'string', required: false, default: 'default-co' },
        ],
      },
      output: { type: 'json' },
      tenancy: { companyParam: 'companySlug' },
      handler: async (args) => ({ companySlug: args.companySlug }),
    });

    await cmd.execute({} as any, { interface: 'cli' });
    expect(guard).toHaveBeenCalledWith('default-co', expect.anything());
  });
});
