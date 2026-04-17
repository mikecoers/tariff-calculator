import { describe, expect, it } from 'vitest';
import { advanceRunners, basesLoaded, emptyBases } from '../bases';

describe('advanceRunners', () => {
  it('single with nobody on puts batter on first', () => {
    const r = advanceRunners(emptyBases(), 'single', 'B');
    expect(r.bases).toEqual({ first: 'B', second: null, third: null });
    expect(r.runs).toBe(0);
  });
  it('single scores runner from third and pushes others', () => {
    const r = advanceRunners({ first: 'A', second: 'B', third: 'C' }, 'single', 'D');
    expect(r.scored).toEqual(['C']);
    expect(r.bases).toEqual({ first: 'D', second: 'A', third: 'B' });
  });
  it('double scores third and second; batter to 2nd', () => {
    const r = advanceRunners({ first: 'A', second: 'B', third: 'C' }, 'double', 'D');
    expect(r.scored).toEqual(['C', 'B']);
    expect(r.bases).toEqual({ first: null, second: 'D', third: 'A' });
  });
  it('triple clears bases, batter to 3rd', () => {
    const r = advanceRunners({ first: 'A', second: 'B', third: 'C' }, 'triple', 'D');
    expect(r.runs).toBe(3);
    expect(r.bases).toEqual({ first: null, second: null, third: 'D' });
  });
  it('HR with bases loaded scores 4', () => {
    const r = advanceRunners({ first: 'A', second: 'B', third: 'C' }, 'hr', 'D');
    expect(r.runs).toBe(4);
    expect(r.bases).toEqual({ first: null, second: null, third: null });
  });
  it('walk with bases loaded forces home a run', () => {
    const r = advanceRunners({ first: 'A', second: 'B', third: 'C' }, 'walk', 'D');
    expect(r.scored).toEqual(['C']);
    expect(r.bases).toEqual({ first: 'D', second: 'A', third: 'B' });
  });
  it('walk with only runner on first pushes to second', () => {
    const r = advanceRunners({ first: 'A', second: null, third: null }, 'walk', 'B');
    expect(r.bases).toEqual({ first: 'B', second: 'A', third: null });
    expect(r.runs).toBe(0);
  });
  it('walk with runners on first and third keeps third, pushes first to second', () => {
    const r = advanceRunners({ first: 'A', second: null, third: 'C' }, 'walk', 'B');
    expect(r.bases).toEqual({ first: 'B', second: 'A', third: 'C' });
    expect(r.runs).toBe(0);
  });
  it('strikeout does not move runners', () => {
    const r = advanceRunners({ first: 'A', second: null, third: 'C' }, 'strikeout', 'B');
    expect(r.bases).toEqual({ first: 'A', second: null, third: 'C' });
    expect(r.runs).toBe(0);
  });
  it('basesLoaded works', () => {
    expect(basesLoaded({ first: 'A', second: 'B', third: 'C' })).toBe(true);
    expect(basesLoaded({ first: null, second: 'B', third: 'C' })).toBe(false);
  });
});
