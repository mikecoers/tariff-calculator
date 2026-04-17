import type { DefensiveAssignment, Player, Position, SeasonSettings, Game, PitcherAppearance } from '@/types';
import { DEFENSIVE_POSITIONS, INFIELD, OUTFIELD } from '@/types';
import { auditPlayingTime } from '@/features/rules/playingTimeRules';
import { pitcherEligibilityFromHistory } from '@/features/rules/pitchingRules';
import { catcherToPitcherSameInning, catcherInningsPitched3Plus } from '@/features/rules/catcherRules';

export interface DefensiveRecommendation {
  inning: number;
  assignments: Array<{ playerId: string; position: Position; reason?: string }>;
  bench: string[];
  notes: string[];
}

interface Candidate {
  player: Player;
  score: number;
  reasons: string[];
}

const POSITION_WEIGHT: Record<Position, number> = {
  P: 100, C: 95, SS: 80, '1B': 70, '3B': 65, '2B': 60, CF: 58, LF: 45, RF: 42, BN: 0, EH: 0
};

export function recommendDefensiveLineup(args: {
  players: Player[];
  game: Game;
  nextInning: number;
  settings: SeasonSettings;
  priorAssignments: DefensiveAssignment[];
  lockedAssignments?: Array<{ playerId: string; position: Position }>;
  appearancesForPlayers?: Record<string, PitcherAppearance[]>;
}): DefensiveRecommendation {
  const {
    players,
    game,
    nextInning,
    settings,
    priorAssignments,
    lockedAssignments = [],
    appearancesForPlayers = {}
  } = args;

  const active = players.filter((p) => p.active);
  const audits = auditPlayingTime(active, priorAssignments, game, settings);
  const auditByPlayer = new Map(audits.map((a) => [a.playerId, a]));
  const innsLeft = Math.max(1, settings.maxInnings - nextInning + 1);
  const notes: string[] = [];

  const assignments: DefensiveRecommendation['assignments'] = [];
  const assignedPlayerIds = new Set<string>();
  const filledPositions = new Set<Position>();

  for (const lock of lockedAssignments) {
    assignments.push({ playerId: lock.playerId, position: lock.position, reason: 'Locked by coach.' });
    assignedPlayerIds.add(lock.playerId);
    filledPositions.add(lock.position);
  }

  const priorityOrder: Position[] = ['P', 'C', 'SS', '1B', '3B', '2B', 'CF', 'LF', 'RF'];

  for (const pos of priorityOrder) {
    if (filledPositions.has(pos)) continue;
    const eligibles: Candidate[] = [];
    for (const p of active) {
      if (assignedPlayerIds.has(p.id)) continue;
      const reasons: string[] = [];
      let score = 0;

      const audit = auditByPlayer.get(p.id);
      const need = audit?.inningsStillNeeded ?? 0;
      const firstHalfNeed = audit?.firstHalfStillNeeded ?? 0;
      if (need > 0) {
        score += need * 25;
        reasons.push(`Needs ${need} more defensive inning${need === 1 ? '' : 's'}.`);
      }
      if (firstHalfNeed > 0 && nextInning <= settings.firstHalfInningBoundary) {
        score += firstHalfNeed * 30;
        reasons.push(`Early-innings deficit (${firstHalfNeed} remaining).`);
      }
      if (need > innsLeft - 1) {
        score += 150;
        reasons.push('At-risk: can only just meet minimum.');
      }

      if (p.preferredPositions.includes(pos)) {
        score += 35;
        reasons.push(`Preferred position (${pos}).`);
      } else if (p.secondaryPositions.includes(pos)) {
        score += 15;
        reasons.push(`Secondary position (${pos}).`);
      }

      if (pos === 'P') {
        const hist = appearancesForPlayers[p.id] ?? [];
        const elig = pitcherEligibilityFromHistory(p.id, game.date, hist, settings);
        if (!elig.eligibleToday) {
          continue;
        }
        const sameInningCatch = catcherToPitcherSameInning(priorAssignments, p.id, nextInning, settings);
        if (sameInningCatch.blocked) continue;
        if (catcherInningsPitched3Plus(priorAssignments, p.id).blocked) continue;
      }

      if (pos === 'C') {
        if (p.isCatcher) {
          score += 25;
          reasons.push('Designated catcher.');
        }
      }

      // Repetition penalty: avoid assigning same position two innings in a row
      const last = [...priorAssignments]
        .filter((a) => a.playerId === p.id)
        .sort((a, b) => b.inning - a.inning)[0];
      if (last && last.position === pos && last.inning === nextInning - 1) {
        score -= 10;
        reasons.push('Played same position last inning.');
      }

      // Slight bump for position weight so premium positions go to better fits
      score += POSITION_WEIGHT[pos] / 20;

      eligibles.push({ player: p, score, reasons });
    }

    eligibles.sort((a, b) => b.score - a.score);
    const pick = eligibles[0];
    if (!pick) {
      notes.push(`No eligible player for ${pos}.`);
      continue;
    }
    assignments.push({ playerId: pick.player.id, position: pos, reason: pick.reasons[0] });
    assignedPlayerIds.add(pick.player.id);
    filledPositions.add(pos);
  }

  const bench = active.filter((p) => !assignedPlayerIds.has(p.id)).map((p) => p.id);
  return { inning: nextInning, assignments, bench, notes };
}

export function recommendBattingOrder(players: Player[]): string[] {
  const active = players.filter((p) => p.active);
  return active
    .slice()
    .sort((a, b) => {
      const pa = a.preferredPositions.length + (a.isCatcher ? 1 : 0);
      const pb = b.preferredPositions.length + (b.isCatcher ? 1 : 0);
      return pb - pa;
    })
    .map((p) => p.id);
}

// ensure imports used
void DEFENSIVE_POSITIONS;
void INFIELD;
void OUTFIELD;
