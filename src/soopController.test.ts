import { describe, expect, it, vi } from 'vitest';
import { applyBalloon } from './soopController';

describe('applyBalloon', () => {
  it('S1: adds floor(count / perEntry) entries under the donor and commits the new list', () => {
    const commit = vi.fn();
    const result = applyBalloon('a*2', { sender: 'bob', count: 300 }, 100, commit);
    expect(result).toBe('a*2,bob*3');
    expect(commit).toHaveBeenCalledWith('a*2,bob*3');
  });

  it('S2b: accumulates into an existing donor', () => {
    const commit = vi.fn();
    const result = applyBalloon('bob*1', { sender: 'bob', count: 200 }, 100, commit);
    expect(result).toBe('bob*3');
    expect(commit).toHaveBeenCalledWith('bob*3');
  });

  it('S2 edge: a below-threshold donation adds nothing and does NOT commit', () => {
    const commit = vi.fn();
    const result = applyBalloon('a*2', { sender: 'bob', count: 50 }, 100, commit);
    expect(result).toBe('a*2');
    expect(commit).not.toHaveBeenCalled();
  });

  it('S2 edge: invalid perEntry adds nothing and does NOT commit', () => {
    const commit = vi.fn();
    const result = applyBalloon('a*2', { sender: 'bob', count: 300 }, 0, commit);
    expect(result).toBe('a*2');
    expect(commit).not.toHaveBeenCalled();
  });

  it('S1: works from an empty list', () => {
    const commit = vi.fn();
    const result = applyBalloon('', { sender: 'bob', count: 100 }, 100, commit);
    expect(result).toBe('bob');
    expect(commit).toHaveBeenCalledWith('bob');
  });
});
