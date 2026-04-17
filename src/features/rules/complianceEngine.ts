import type {
  Alert,
  DefensiveAssignment,
  Game,
  PitchEvent,
  PitcherAppearance,
  Player,
  SeasonSettings
} from '@/types';
import { auditPlayingTime, playingTimeRisks } from './playingTimeRules';
import { pitchLimitStatus } from './pitchingRules';
import { newId, now } from '@/lib/id';

export interface ComplianceSummary {
  gameId: string;
  generatedAt: number;
  playingTime: Array<{
    playerId: string;
    name: string;
    defensiveInnings: number;
    firstHalfInnings: number;
    met: boolean;
    firstHalfMet: boolean;
  }>;
  pitching: Array<{
    playerId: string;
    name: string;
    pitches: number;
    tier: string;
    restDaysIfStopNow: number;
  }>;
  issues: Alert[];
}

export function buildComplianceSummary(args: {
  game: Game;
  settings: SeasonSettings;
  players: Player[];
  assignments: DefensiveAssignment[];
  appearances: PitcherAppearance[];
  pitchEvents: PitchEvent[];
  alerts: Alert[];
}): ComplianceSummary {
  const { game, settings, players, assignments, pitchEvents, alerts } = args;
  const playersById = new Map(players.map((p) => [p.id, p]));
  const audits = auditPlayingTime(players, assignments, game, settings);
  const pitchersById = new Map<string, number>();
  for (const p of pitchEvents) {
    pitchersById.set(p.pitcherPlayerId, (pitchersById.get(p.pitcherPlayerId) ?? 0) + 1);
  }
  return {
    gameId: game.id,
    generatedAt: now(),
    playingTime: audits.map((a) => ({
      playerId: a.playerId,
      name: playersById.get(a.playerId)?.displayName ?? 'Player',
      defensiveInnings: a.defensiveInnings,
      firstHalfInnings: a.firstHalfInnings,
      met: a.minMet,
      firstHalfMet: a.firstHalfMet
    })),
    pitching: Array.from(pitchersById.entries()).map(([playerId, pitches]) => {
      const p = playersById.get(playerId);
      const status = pitchLimitStatus(pitches, p?.age, settings);
      return {
        playerId,
        name: p?.displayName ?? 'Pitcher',
        pitches,
        tier: status.tier,
        restDaysIfStopNow: status.restDaysIfStopNow
      };
    }),
    issues: alerts.filter((a) => !a.resolvedAt)
  };
}

export function computeLiveAlerts(args: {
  game: Game;
  settings: SeasonSettings;
  players: Player[];
  assignments: DefensiveAssignment[];
  pitchEvents: PitchEvent[];
}): Alert[] {
  const { game, settings, players, assignments, pitchEvents } = args;
  const playersById = new Map(players.map((p) => [p.id, p]));
  const audits = auditPlayingTime(players, assignments, game, settings);
  const risks = playingTimeRisks(audits, game, settings, playersById);
  const alerts: Alert[] = risks.map((r) => ({
    id: newId('al'),
    gameId: game.id,
    type: r.type,
    severity: r.severity,
    playerId: r.playerId,
    inning: game.inning,
    message: r.message,
    createdAt: now()
  }));

  // Pitcher limits
  const byPitcher = new Map<string, number>();
  for (const pe of pitchEvents) {
    byPitcher.set(pe.pitcherPlayerId, (byPitcher.get(pe.pitcherPlayerId) ?? 0) + 1);
  }
  for (const [pid, count] of byPitcher) {
    const p = playersById.get(pid);
    const status = pitchLimitStatus(count, p?.age, settings);
    if (status.tier === 'over') {
      alerts.push({
        id: newId('al'),
        gameId: game.id,
        type: 'pitcher_limit_reached',
        severity: 'critical',
        playerId: pid,
        inning: game.inning,
        message: `${p?.displayName ?? 'Pitcher'} is OVER the daily limit (${count}/${status.dailyMax}).`,
        createdAt: now()
      });
    } else if (status.tier === 'red') {
      alerts.push({
        id: newId('al'),
        gameId: game.id,
        type: 'pitcher_limit_near',
        severity: 'warning',
        playerId: pid,
        inning: game.inning,
        message: `${p?.displayName ?? 'Pitcher'} is at ${count}/${status.dailyMax} pitches — pull soon.`,
        createdAt: now()
      });
    }
  }

  return alerts;
}
