import { describe, expect, it } from 'vitest';
import { CommandRegistry } from '../CommandRegistry';
import { UniversalCommand } from '../UniversalCommand';
import { createMCPServer } from './index';
import type { CommandSchema } from '../types';

function command(name: string, mcp?: Record<string, unknown>): UniversalCommand {
  return new UniversalCommand({
    name,
    description: name,
    input: { parameters: [] },
    output: { type: 'json' },
    handler: async () => ({ ok: true }),
    ...(mcp ? { mcp: mcp as CommandSchema['mcp'] } : {}),
  });
}

describe('toMCP policy metadata', () => {
  it('a command with no mcp.access carries no annotations and no policy, so the gateway treats it as a high danger write', () => {
    const tool = command('plain').toMCP();
    expect(tool.annotations).toBeUndefined();
    expect(tool._meta).toBeUndefined();
  });

  it('an invalid access word declares nothing', () => {
    expect(command('bad', { access: 'readonly' }).toMCP()._meta).toBeUndefined();
  });

  it.each([
    ['danger critical', { access: 'write', danger: 'critical' }],
    ['danger upper case', { access: 'write', danger: 'HIGH' }],
    ['danger number', { access: 'read', danger: 5 }],
    ['approval string', { access: 'write', approval: 'true' }],
    ['approval number', { access: 'write', approval: 1 }],
    ['capability array', { access: 'write', requiredCapability: ['board:write'] }],
    ['capability empty', { access: 'write', requiredCapability: '' }],
  ])(
    'a present but invalid value (%s) declares nothing, so the gateway fails closed',
    (_label, mcp) => {
      const tool = command('invalid', mcp).toMCP();
      expect(tool._meta).toBeUndefined();
      expect(tool.annotations).toBeUndefined();
    }
  );

  it('a low danger read maps to a read only hint and a policy entry', () => {
    const tool = command('r', { access: 'read' }).toMCP();
    expect(tool.annotations).toEqual({ readOnlyHint: true, destructiveHint: false });
    expect(tool._meta).toEqual({
      'supernal/policy': { access: 'read', danger: 'low', approval: false },
    });
  });

  it('a high danger write is destructive and keeps its capability and approval flag', () => {
    const tool = command('w', {
      access: 'write',
      danger: 'high',
      requiredCapability: 'board:write',
      approval: true,
    }).toMCP();
    expect(tool.annotations).toEqual({ readOnlyHint: false, destructiveHint: true });
    expect(tool._meta).toEqual({
      'supernal/policy': {
        access: 'write',
        danger: 'high',
        approval: true,
        requiredCapability: 'board:write',
      },
    });
  });

  it('a write with no danger given is medium and not destructive', () => {
    const tool = command('w2', { access: 'write' }).toMCP();
    expect(tool.annotations).toEqual({ readOnlyHint: false, destructiveHint: false });
    expect((tool._meta as Record<string, { danger: string }>)['supernal/policy']?.danger).toBe(
      'medium'
    );
  });
});

describe('createMCPServer tools/list policy metadata', () => {
  it('lists the policy of a declaring tool and nothing extra for one that declares none', async () => {
    const { InMemoryTransport } = await import('@modelcontextprotocol/server');
    const { Client } = await import('@modelcontextprotocol/client');
    const registry = new CommandRegistry();
    registry.register(command('declared', { access: 'read', requiredCapability: 'board:read' }));
    registry.register(command('undeclared'));
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = await createMCPServer(registry, { name: 'policy-test', version: '0.0.1' });
    const client = new Client({ name: 'policy-test-client', version: '0.0.1' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const { tools } = await client.listTools();
      const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
      expect(byName.sc_declared?._meta).toEqual({
        'supernal/policy': {
          access: 'read',
          danger: 'low',
          approval: false,
          requiredCapability: 'board:read',
        },
      });
      expect(byName.sc_declared?.annotations).toMatchObject({ readOnlyHint: true });
      expect(byName.sc_undeclared?._meta).toBeUndefined();
      expect(byName.sc_undeclared?.annotations).toBeUndefined();
    } finally {
      await client.close();
      await server.close();
    }
  });
});
