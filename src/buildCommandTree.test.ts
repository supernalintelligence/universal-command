import { describe, it, expect } from 'vitest';
import { Command } from 'commander';
import { UniversalCommand } from './UniversalCommand';

const ran: string[] = [];

const make = (name: string, result: string) =>
  new UniversalCommand({
    name,
    description: name,
    input: { parameters: [] },
    output: { type: 'text' },
    handler: async () => (ran.push(result), result),
  });

async function run(commands: UniversalCommand[], argv: string[]): Promise<string[]> {
  ran.length = 0;
  const program = new Command().exitOverride();
  for (const root of UniversalCommand.buildCommandTree(commands)) program.addCommand(root);
  const exit = process.exit;
  process.exit = (() => undefined) as typeof process.exit;
  try {
    await program.parseAsync(['node', 'sc', ...argv]);
  } finally {
    process.exit = exit;
  }
  return [...ran];
}

describe('buildCommandTree', () => {
  const leaf = make('room approve', 'APPROVE');
  const child = make('room approve precheck', 'PRECHECK');

  it('builds a tree when a leaf is also the parent of another command', () => {
    expect(() => UniversalCommand.buildCommandTree([child, leaf])).not.toThrow();
    expect(() => UniversalCommand.buildCommandTree([leaf, child])).not.toThrow();
  });

  it.each([
    ['leaf first', [leaf, child]],
    ['child first', [child, leaf]],
  ])('runs both the leaf and its child (%s)', async (_label, commands) => {
    expect(await run(commands, ['room', 'approve'])).toEqual(['APPROVE']);
    expect(await run(commands, ['room', 'approve', 'precheck'])).toEqual(['PRECHECK']);
  });
});
