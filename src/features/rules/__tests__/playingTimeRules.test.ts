import { describe, expect, it } from 'vitest';
import { auditPlayingTime, playingTimeRisks } from '../playingTimeRules';
import { defaultSeasonSettings } from '@/features/settings/defaults';
import type { DefensiveAssignment, Game, Player } from '@/types';
import { newId, now } from '@/lib/id';

const settings = defaultSeasonSettings('tm_test', 2026);

function mkPlayer(id: string, name: string): Player {
  return {
    id,
    teamId: 'tm_test',
    firstName: name,
    lastName: 'X',
    displayName: name,
    preferredPositions: [],
    secondaryPositions: [],
    active: true,
    createdAt: now(),
    updatedAt: now()
  };
}

function mkGame(inning = 1): Game {
  return {
    id: 'g1',
    teamId: 'tm_test',
    opponent: 'Opp',
    date: now(),
    homeAway: 'home',
    status: 'in_progress',
    seasonPhase: 'early',
    inning,
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
    updatedAt: now()
  };
}

function mkAssign(playerId: string, inning: number, position: 'SS' | 'CF' | 'C' = 'SS'): DefensiveAssignment {
  return {
    id: newId('da'),
    gameId: 'g1',
    inning,
    playerId,
    position,
    startedInning: inning,
    source: 'auto'
  };
}

describe('auditPlayingTime', () => {
  it('counts defensive innings per player', () => {
    const p1 = mkPlayer('p1', 'Alice');
    const p2 = mkPlayer('p2', 'Bob');
    const game = mkGame(4);
    const assigns = [mkAssign('p1', 1), mkAssign('p1', 2), mkAssign('p2', 1)];
    const result = auditPlayingTime([p1, p2], assigns, game, settings);
    expect(result.find((r) => r.playerId === 'p1')?.defensiveInnings).toBe(2);
    expect(result.find((r) => r.playerId === 'p2')?.defensiveInnings).toBe(1);
  });

  it('flags when min defensive innings cannot be met', () => {
    const p1 = mkPlayer('p1', 'Alice');
    const game = mkGame(6);
    const assigns = [mkAssign('p1', 1)];
    const audits = auditPlayingTime([p1], assigns, game, settings);
    const risks = playingTimeRisks(audits, game, settings, new Map([['p1', p1]]));
    expect(risks.some((r) => r.severity === 'critical' && r.type === 'playing_time_violation')).toBe(true);
  });
});
