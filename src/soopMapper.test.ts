import { describe, expect, it } from 'vitest';
import { accumulateName, balloonToEntries } from './soopMapper';

describe('balloonToEntries', () => {
  it('S1: converts a donation amount into floor(amount / perEntry) entries', () => {
    expect(balloonToEntries(300, 100)).toBe(3);
  });

  it('S1: exact multiple maps cleanly', () => {
    expect(balloonToEntries(100, 100)).toBe(1);
    expect(balloonToEntries(500, 100)).toBe(5);
  });

  it('S1: non-multiple amounts floor down', () => {
    expect(balloonToEntries(250, 100)).toBe(2);
  });

  it('S2 edge: below-threshold donations produce zero entries', () => {
    expect(balloonToEntries(50, 100)).toBe(0);
    expect(balloonToEntries(99, 100)).toBe(0);
  });

  it('S2 edge: zero / negative amount produces zero entries', () => {
    expect(balloonToEntries(0, 100)).toBe(0);
    expect(balloonToEntries(-100, 100)).toBe(0);
  });

  it('S2 edge: invalid perEntry (<=0) is treated as no entries, never throws', () => {
    expect(balloonToEntries(300, 0)).toBe(0);
    expect(balloonToEntries(300, -5)).toBe(0);
  });
});

describe('accumulateName', () => {
  it('S1: appends a new donor with a count when entries > 1', () => {
    expect(accumulateName('a*2', 'bob', 3)).toBe('a*2,bob*3');
  });

  it('S1: appends a new donor without *count when exactly one entry', () => {
    expect(accumulateName('a*2', 'bob', 1)).toBe('a*2,bob');
  });

  it('S2b edge: accumulates into an existing donor that has a *count', () => {
    expect(accumulateName('bob*1', 'bob', 2)).toBe('bob*3');
  });

  it('S2b edge: accumulates into an existing donor that has no explicit count (implicit 1)', () => {
    expect(accumulateName('bob', 'bob', 2)).toBe('bob*3');
  });

  it('S2b edge: preserves other names and order while accumulating one donor', () => {
    expect(accumulateName('alice*2,bob*1,carol', 'bob', 1)).toBe('alice*2,bob*2,carol');
  });

  it('S1: works from an empty textarea', () => {
    expect(accumulateName('', 'bob', 3)).toBe('bob*3');
  });

  it('S2 edge: zero entries leaves the textarea untouched', () => {
    expect(accumulateName('a*2', 'bob', 0)).toBe('a*2');
    expect(accumulateName('', 'bob', 0)).toBe('');
  });

  it('S2b edge: preserves a donor weight suffix when accumulating', () => {
    expect(accumulateName('bob/5*2', 'bob', 1)).toBe('bob/5*3');
  });

  it('S1: trims surrounding whitespace in the source list', () => {
    expect(accumulateName(' a , b ', 'c', 1)).toBe('a,b,c');
  });

  it('S5 security: strips commas from a donor nickname so it cannot split into multiple marbles', () => {
    expect(accumulateName('a*2', 'bo,b', 3)).toBe('a*2,bob*3');
  });

  it('S5 security: strips the count separator (*) from a donor nickname', () => {
    expect(accumulateName('a*2', 'bo*b', 3)).toBe('a*2,bob*3');
  });

  it('S5 security: strips the weight separator (/) from a donor nickname so it cannot inject a weight', () => {
    expect(accumulateName('a*2', 'bo/9', 3)).toBe('a*2,bo9*3');
  });

  it('S5 security: strips newlines/carriage returns from a donor nickname', () => {
    expect(accumulateName('a*2', 'bo\nb\rc', 3)).toBe('a*2,bobc*3');
  });

  it('S5 security: a nickname that is only reserved characters yields no entry (nothing to add)', () => {
    expect(accumulateName('a*2', ',*/', 3)).toBe('a*2');
  });

  it('S5 security: a sanitized repeat donor still accumulates against the existing sanitized name', () => {
    expect(accumulateName('bob*1', 'b,o,b', 2)).toBe('bob*3');
  });
});
