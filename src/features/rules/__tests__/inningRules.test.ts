import { describe, expect, it } from 'vitest';
import { inningRunCapReached, runsRemainingThisInning, shouldEndHalfInning, nextHalfInning, isGameOver } from '../inningRules';
import { defaultSeasonSettings } from '@/features/settings/defaults';
import type { Game } from '@/types';
import { now } from '@/lib/id';

const settings = defaultSeasonSettings('t', 2026);

function game(partial: Partial<Game> = {}): Game {
  return {
    id: 'g',
    teamId: 't',
    opponent: 'Opp',
    date: now(),
    homeAway: 'home',
    status: 'in_progress',
    seasonPhase: 'early',
    inning: 1,
    halfInning: 'top',
    outs: 0,
    balls: 0,
    strikes: 0,
    homeScore: 0,
    awayScore: 0,
    runsThisInning: 0,
    currentBatterSlot: 0,
    elapsedSeconds: 0,
    rosterPlayerIds: [],
    absentPlayerIds: [],
    createdAt: now(),
    updatedAt: now(),
    ...partial
  };
}

describe('inning rules', () => {
  it('caps runs in normal inning', () => {
    expect(inningRunCapReached(game({ runsThisInning: 5 }), settings)).toBe(true);
    expect(inningRunCapReached(game({ runsThisInning: 4 }), settings)).toBe(false);
  });
  it('uncaps final inning when configured', () => {
    expect(inningRunCapReached(game({ runsThisInning: 7, inning: 6 }), settings)).toBe(false);
  });
  it('remaining runs accounts for cap', () => {
    expect(runsRemainingThisInning(game({ runsThisInning: 2 }), settings)).toBe(3);
    expect(runsRemainingThisInning(game({ runsThisInning: 9, inning: 6 }), settings)).toBeNull();
  });
  it('ends half on 3 outs', () => {
    expect(shouldEndHalfInning(game({ outs: 3 }), settings)).toBe(true);
  });
  it('next half flips top/bottom', () => {
    expect(nextHalfInning(game({ halfInning: 'top' })).halfInning).toBe('bottom');
    expect(nextHalfInning(game({ halfInning: 'bottom' })).inning).toBe(2);
  });
  it('detects game over at max innings', () => {
    expect(isGameOver(game({ inning: 7 }), settings)).toBe(true);
    expect(isGameOver(game({ inning: 6, halfInning: 'bottom', outs: 3 }), settings)).toBe(true);
  });
});
