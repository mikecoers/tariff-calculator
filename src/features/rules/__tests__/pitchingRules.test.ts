import { describe, expect, it } from 'vitest';
import {
  restDaysForPitches,
  pitchLimitStatus,
  pitcherEligibilityFromHistory,
  consecutiveDaysPitched
} from '../pitchingRules';
import { defaultSeasonSettings } from '@/features/settings/defaults';
import type { PitcherAppearance } from '@/types';

const settings = defaultSeasonSettings('tm_test', 2026);

describe('restDaysForPitches', () => {
  it('applies 0 days for 1-20 pitches', () => {
    expect(restDaysForPitches(1, settings.pitchCountRestTiers)).toBe(0);
    expect(restDaysForPitches(20, settings.pitchCountRestTiers)).toBe(0);
  });
  it('applies 1 day for 21-35', () => {
    expect(restDaysForPitches(21, settings.pitchCountRestTiers)).toBe(1);
    expect(restDaysForPitches(35, settings.pitchCountRestTiers)).toBe(1);
  });
  it('applies 2 days for 36-50', () => {
    expect(restDaysForPitches(50, settings.pitchCountRestTiers)).toBe(2);
  });
  it('applies 3 days for 51-65', () => {
    expect(restDaysForPitches(65, settings.pitchCountRestTiers)).toBe(3);
  });
  it('applies 4 days for 66+', () => {
    expect(restDaysForPitches(66, settings.pitchCountRestTiers)).toBe(4);
    expect(restDaysForPitches(200, settings.pitchCountRestTiers)).toBe(4);
  });
});

describe('pitchLimitStatus', () => {
  it('green early', () => {
    expect(pitchLimitStatus(10, 10, settings).tier).toBe('green');
  });
  it('yellow near cap', () => {
    expect(pitchLimitStatus(60, 10, settings).tier).toBe('yellow');
  });
  it('red very near cap', () => {
    expect(pitchLimitStatus(72, 10, settings).tier).toBe('red');
  });
  it('over cap', () => {
    expect(pitchLimitStatus(80, 10, settings).tier).toBe('over');
  });
});

describe('pitcherEligibilityFromHistory', () => {
  it('is eligible when no history', () => {
    const e = pitcherEligibilityFromHistory('pl_1', Date.now(), [], settings);
    expect(e.eligibleToday).toBe(true);
  });
  it('respects required rest days', () => {
    const five = 5 * 24 * 60 * 60 * 1000;
    const appearances: PitcherAppearance[] = [
      {
        id: 'pa_1',
        gameId: 'g1',
        playerId: 'pl_1',
        inningStart: 1,
        pitchesThrown: 60,
        battersFaced: 10,
        walks: 0,
        strikeouts: 2,
        earnedRuns: 0,
        restDaysRequired: 3,
        date: Date.now() - five
      }
    ];
    const e = pitcherEligibilityFromHistory('pl_1', Date.now(), appearances, settings);
    expect(e.eligibleToday).toBe(true);
  });
  it('blocks when not enough rest', () => {
    const appearances: PitcherAppearance[] = [
      {
        id: 'pa_1',
        gameId: 'g1',
        playerId: 'pl_1',
        inningStart: 1,
        pitchesThrown: 60,
        battersFaced: 10,
        walks: 0,
        strikeouts: 2,
        earnedRuns: 0,
        restDaysRequired: 3,
        date: Date.now() - 24 * 60 * 60 * 1000
      }
    ];
    const e = pitcherEligibilityFromHistory('pl_1', Date.now(), appearances, settings);
    expect(e.eligibleToday).toBe(false);
  });
});

describe('consecutiveDaysPitched', () => {
  it('counts consecutive prior days', () => {
    const d = Date.now();
    const one = 24 * 60 * 60 * 1000;
    const appearances: PitcherAppearance[] = [
      { id: '1', gameId: 'g', playerId: 'p', inningStart: 1, pitchesThrown: 5, battersFaced: 1, walks: 0, strikeouts: 0, earnedRuns: 0, restDaysRequired: 0, date: d - one },
      { id: '2', gameId: 'g', playerId: 'p', inningStart: 1, pitchesThrown: 5, battersFaced: 1, walks: 0, strikeouts: 0, earnedRuns: 0, restDaysRequired: 0, date: d - 2 * one }
    ];
    expect(consecutiveDaysPitched('p', d, appearances)).toBeGreaterThanOrEqual(1);
  });
});
