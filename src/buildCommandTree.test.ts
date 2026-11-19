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

  it('handles a three-level chain and a root-level parent in any order', async () => {
    const chain = [
      make('a b c d', 'D'),
      make('a b', 'B'),
      make('a b c', 'C'),
      make('a', 'A'),
      make('a x', 'X'),
    ];
    expect(await run(chain, ['a'])).toEqual(['A']);
    expect(await run(chain, ['a', 'b'])).toEqual(['B']);
    expect(await run(chain, ['a', 'b', 'c'])).toEqual(['C']);
    expect(await run(chain, ['a', 'b', 'c', 'd'])).toEqual(['D']);
    expect(await run(chain, ['a', 'x'])).toEqual(['X']);
  });

  it('keeps the given order of roots when no command is a parent', () => {
    const names = ['zeta one', 'alpha two', 'mid three'].map((n) => make(n, n));
    const roots = UniversalCommand.buildCommandTree(names).map((c: Command) => c.name());
    expect(roots).toEqual(['zeta', 'alpha', 'mid']);
  });

  it.each([
    ['leaf first', [leaf, child]],
    ['child first', [child, leaf]],
  ])('runs both the leaf and its child (%s)', async (_label, commands) => {
    expect(await run(commands, ['room', 'approve'])).toEqual(['APPROVE']);
    expect(await run(commands, ['room', 'approve', 'precheck'])).toEqual(['PRECHECK']);
  });
});
