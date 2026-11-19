import { describe, it, expect, vi } from 'vitest';
import { loadNextResponse } from './nextResponse';

describe('loadNextResponse', () => {
  it('prefers the require loader and does not call the import loader', async () => {
    const NextResponse = { json: vi.fn() };
    const importFn = vi.fn();
    expect(await loadNextResponse(() => ({ NextResponse }), importFn)).toBe(NextResponse);
    expect(importFn).not.toHaveBeenCalled();
  });

  it('falls back to the import loader when require throws', async () => {
    const NextResponse = { json: vi.fn() };
    const requireFn = () => {
      throw new Error('no require');
    };
    expect(await loadNextResponse(requireFn, async () => ({ default: { NextResponse } }))).toBe(
      NextResponse
    );
  });

  it('returns undefined when both loaders fail', async () => {
    const boom = () => {
      throw new Error('missing');
    };
    expect(await loadNextResponse(boom, boom)).toBeUndefined();
  });

  it('resolves the real NextResponse by default', async () => {
    const { NextResponse } = await import('next/server');
    expect(await loadNextResponse()).toBe(NextResponse);
  });
});
