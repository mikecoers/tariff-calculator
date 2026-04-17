import type { DefensiveAssignment, Game, Player, SeasonSettings, Position } from '@/types';
import { DEFENSIVE_POSITIONS } from '@/types';

export interface PlayerTimeAudit {
  playerId: string;
  defensiveInnings: number;
  firstHalfInnings: number;
  benchedInnings: number;
  innings: number[];
  firstHalfMet: boolean;
  minMet: boolean;
  inningsStillNeeded: number;
  firstHalfStillNeeded: number;
}

export function inningsPlayedByPlayer(
  assignments: DefensiveAssignment[]
): Map<string, Set<number>> {
  const map = new Map<string, Set<number>>();
  for (const a of assignments) {
    if (!DEFENSIVE_POSITIONS.includes(a.position)) continue;
    let set = map.get(a.playerId);
    if (!set) {
      set = new Set();
      map.set(a.playerId, set);
    }
    set.add(a.inning);
  }
  return map;
}

export function auditPlayingTime(
  players: Player[],
  assignments: DefensiveAssignment[],
  game: Game,
  settings: SeasonSettings
): PlayerTimeAudit[] {
  const innings = inningsPlayedByPlayer(assignments);
  const maxInning = Math.max(game.inning, settings.maxInnings);
  return players.map((p) => {
    const set = innings.get(p.id) ?? new Set<number>();
    const innArr = Array.from(set).sort((a, b) => a - b);
    const firstHalf = innArr.filter((i) => i <= settings.firstHalfInningBoundary).length;
    const defInn = innArr.length;
    const benched = Math.max(0, game.inning - defInn);
    const remainingInnings = Math.max(0, maxInning - game.inning);
    const inningsStillNeeded = Math.max(0, settings.minDefensiveInnings - defInn);
    const firstHalfStillNeeded = Math.max(0, settings.minFirstHalfInnings - firstHalf);
    const _ = remainingInnings;
    return {
      playerId: p.id,
      defensiveInnings: defInn,
      firstHalfInnings: firstHalf,
      benchedInnings: benched,
      innings: innArr,
      firstHalfMet: firstHalf >= settings.minFirstHalfInnings,
      minMet: defInn >= settings.minDefensiveInnings,
      inningsStillNeeded,
      firstHalfStillNeeded
    };
  });
}

export interface PlayingTimeRisk {
  playerId: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  type:
    | 'playing_time_risk'
    | 'playing_time_violation'
    | 'early_innings_risk'
    | 'bench_too_long';
}

export function playingTimeRisks(
  audits: PlayerTimeAudit[],
  game: Game,
  settings: SeasonSettings,
  playersById: Map<string, Player>
): PlayingTimeRisk[] {
  const risks: PlayingTimeRisk[] = [];
  const remaining = Math.max(0, settings.maxInnings - game.inning + 1);
  for (const a of audits) {
    const p = playersById.get(a.playerId);
    if (!p || !p.active) continue;
    const name = p.displayName || p.firstName;
    if (a.inningsStillNeeded > remaining) {
      risks.push({
        playerId: a.playerId,
        severity: 'critical',
        type: 'playing_time_violation',
        message: `${name} can no longer meet the ${settings.minDefensiveInnings}-inning minimum (needs ${a.inningsStillNeeded}, ${remaining} innings left).`
      });
    } else if (a.inningsStillNeeded >= remaining) {
      risks.push({
        playerId: a.playerId,
        severity: 'warning',
        type: 'playing_time_risk',
        message: `${name} must play every remaining inning to reach ${settings.minDefensiveInnings}.`
      });
    }
    if (game.inning > settings.firstHalfInningBoundary && !a.firstHalfMet) {
      risks.push({
        playerId: a.playerId,
        severity: 'critical',
        type: 'early_innings_risk',
        message: `${name} missed the first-${settings.firstHalfInningBoundary}-innings requirement (${a.firstHalfInnings}/${settings.minFirstHalfInnings}).`
      });
    } else if (game.inning === settings.firstHalfInningBoundary && !a.firstHalfMet) {
      risks.push({
        playerId: a.playerId,
        severity: 'warning',
        type: 'early_innings_risk',
        message: `${name} still needs ${a.firstHalfStillNeeded} innings before inning ${settings.firstHalfInningBoundary + 1}.`
      });
    }
    if (a.benchedInnings >= 2) {
      risks.push({
        playerId: a.playerId,
        severity: 'info',
        type: 'bench_too_long',
        message: `${name} has sat ${a.benchedInnings} innings.`
      });
    }
  }
  return risks;
}

export function positionVarietyScore(
  assignments: DefensiveAssignment[],
  playerId: string
): { unique: number; lastPosition?: Position } {
  const positions = assignments
    .filter((a) => a.playerId === playerId && DEFENSIVE_POSITIONS.includes(a.position))
    .sort((a, b) => a.inning - b.inning);
  const unique = new Set(positions.map((a) => a.position));
  return { unique: unique.size, lastPosition: positions[positions.length - 1]?.position };
}
