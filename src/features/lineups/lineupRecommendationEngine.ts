import type { DefensiveAssignment, Player, Position, SeasonSettings, Game, PitcherAppearance } from '@/types';
import { DEFENSIVE_POSITIONS, INFIELD, OUTFIELD } from '@/types';
import { auditPlayingTime } from '@/features/rules/playingTimeRules';
import { pitcherEligibilityFromHistory } from '@/features/rules/pitchingRules';
import { catcherToPitcherSameInning, catcherInningsPitched3Plus } from '@/features/rules/catcherRules';
import { shuffle } from '@/lib/random';

export interface DefensiveRecommendation {
  inning: number;
  assignments: Array<{ playerId: string; position: Position; reason?: string }>;
  bench: string[];
  notes: string[];
}

const POSITION_PRIORITY: Position[] = ['P', 'C', 'SS', '1B', '3B', '2B', 'CF', 'LF', 'RF'];

/**
 * Pick the 9 fielders for a given inning, then assign them to positions.
 *
 * Fairness model (12 kids on a 9-position field):
 *  - Sort by defensive innings already played ASCENDING (least played first).
 *  - Tiebreak by first-half need if we're still in the early part of the game.
 *  - Final tiebreak: random — so it's not always the same kid at the same spot.
 *
 * Position assignment within the chosen 9:
 *  - Lock currentPitcher at P (coach picked them) and isCatcher at C if eligible.
 *  - For everyone else, shuffle and assign by preferred → secondary → any.
 */
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
  const notes: string[] = [];

  const assignments: DefensiveRecommendation['assignments'] = [];
  const assignedPlayerIds = new Set<string>();
  const filledPositions = new Set<Position>();

  // Apply locked assignments first (e.g. the manually-picked pitcher)
  for (const lock of lockedAssignments) {
    if (active.find((p) => p.id === lock.playerId)) {
      assignments.push({ playerId: lock.playerId, position: lock.position, reason: 'Locked by coach.' });
      assignedPlayerIds.add(lock.playerId);
      filledPositions.add(lock.position);
    }
  }

  // ----- STEP 1: Pick the 9 fielders --------------------------------------
  const remainingActive = active.filter((p) => !assignedPlayerIds.has(p.id));
  const slotsToFill = 9 - filledPositions.size;

  const ranked = shuffle(remainingActive)
    .map((p) => {
      const audit = auditByPlayer.get(p.id);
      const defPlayed = audit?.defensiveInnings ?? 0;
      const firstHalfNeed = audit?.firstHalfStillNeeded ?? 0;
      const minNeed = audit?.inningsStillNeeded ?? 0;
      // Lower = higher priority
      // Primary: fewer innings played → higher priority
      // Bonus penalty if they still need first-half innings AND we're in first half
      let priority = defPlayed * 10;
      if (firstHalfNeed > 0 && nextInning <= settings.firstHalfInningBoundary) {
        priority -= 50; // strong push to play this inning
      }
      if (minNeed >= settings.maxInnings - nextInning + 1) {
        priority -= 100; // critical: must play remaining innings
      }
      return { player: p, priority };
    })
    .sort((a, b) => a.priority - b.priority);

  const fielders = ranked.slice(0, slotsToFill).map((r) => r.player);
  const benched = ranked.slice(slotsToFill).map((r) => r.player.id);

  // ----- STEP 2: Assign positions to chosen fielders -----------------------
  // Available positions in priority order
  const positionsToFill = POSITION_PRIORITY.filter((p) => !filledPositions.has(p));

  const fielderShuffle = shuffle(fielders);
  const remainingFielders = new Set(fielderShuffle.map((p) => p.id));

  // Pass A: catcher first (designated catchers preferred)
  if (positionsToFill.includes('C')) {
    const catchers = fielderShuffle.filter(
      (p) =>
        p.isCatcher &&
        remainingFielders.has(p.id) &&
        !catcherInningsPitched3Plus(priorAssignments, p.id).blocked
    );
    if (catchers.length > 0) {
      const pick = catchers[0];
      assignments.push({ playerId: pick.id, position: 'C', reason: 'Designated catcher.' });
      assignedPlayerIds.add(pick.id);
      filledPositions.add('C');
      remainingFielders.delete(pick.id);
    }
  }

  // Pass B: try to honor preferred positions for everyone else
  for (const pos of positionsToFill) {
    if (filledPositions.has(pos)) continue;

    const candidates = shuffle(
      fielderShuffle.filter((p) => remainingFielders.has(p.id) && p.preferredPositions.includes(pos))
    );

    let pick: Player | undefined = candidates[0];
    if (pick && pos === 'P') {
      const hist = appearancesForPlayers[pick.id] ?? [];
      const elig = pitcherEligibilityFromHistory(pick.id, game.date, hist, settings);
      if (!elig.eligibleToday) {
        pick = candidates.find((c) => {
          const h = appearancesForPlayers[c.id] ?? [];
          return pitcherEligibilityFromHistory(c.id, game.date, h, settings).eligibleToday;
        });
      }
      if (pick) {
        const sameInningCatch = catcherToPitcherSameInning(priorAssignments, pick.id, nextInning, settings);
        if (sameInningCatch.blocked) pick = undefined;
      }
    }
    if (pick) {
      assignments.push({ playerId: pick.id, position: pos, reason: `Preferred (${pos}).` });
      assignedPlayerIds.add(pick.id);
      filledPositions.add(pos);
      remainingFielders.delete(pick.id);
    }
  }

  // Pass C: secondary positions
  for (const pos of positionsToFill) {
    if (filledPositions.has(pos)) continue;
    const candidates = shuffle(
      fielderShuffle.filter((p) => remainingFielders.has(p.id) && p.secondaryPositions.includes(pos))
    );
    const pick = candidates[0];
    if (pick) {
      assignments.push({ playerId: pick.id, position: pos, reason: `Secondary (${pos}).` });
      assignedPlayerIds.add(pick.id);
      filledPositions.add(pos);
      remainingFielders.delete(pick.id);
    }
  }

  // Pass D: anyone left, anywhere
  for (const pos of positionsToFill) {
    if (filledPositions.has(pos)) continue;
    const candidates = shuffle(fielderShuffle.filter((p) => remainingFielders.has(p.id)));
    const pick = candidates[0];
    if (pick) {
      assignments.push({ playerId: pick.id, position: pos, reason: 'Open slot.' });
      assignedPlayerIds.add(pick.id);
      filledPositions.add(pos);
      remainingFielders.delete(pick.id);
    } else {
      notes.push(`No eligible player for ${pos}.`);
    }
  }

  return { inning: nextInning, assignments, bench: benched, notes };
}

/**
 * Random batting order each game. Coaches asked for full randomization.
 */
export function recommendBattingOrder(players: Player[]): string[] {
  return shuffle(players.filter((p) => p.active)).map((p) => p.id);
}

/**
 * After a manual position swap, auto-fill any positions left empty by
 * pulling the highest-need player off the bench.
 */
export function autoFillOpenPositions(args: {
  current: Array<{ playerId: string; position: Position }>;
  benchPlayerIds: string[];
  players: Player[];
  game: Game;
  settings: SeasonSettings;
  priorAssignments: DefensiveAssignment[];
}): Array<{ playerId: string; position: Position; reason?: string }> {
  const { current, benchPlayerIds, players, game, settings, priorAssignments } = args;
  const result = [...current.map((c) => ({ ...c, reason: undefined as string | undefined }))];
  const filled = new Set(result.map((r) => r.position));
  const usedPlayers = new Set(result.map((r) => r.playerId));
  const audits = auditPlayingTime(players, priorAssignments, game, settings);
  const auditByPlayer = new Map(audits.map((a) => [a.playerId, a]));

  const benchPool = shuffle(
    benchPlayerIds
      .filter((id) => !usedPlayers.has(id))
      .map((id) => {
        const a = auditByPlayer.get(id);
        return { id, defPlayed: a?.defensiveInnings ?? 0, firstHalfNeed: a?.firstHalfStillNeeded ?? 0 };
      })
  ).sort((a, b) => a.defPlayed - b.defPlayed || b.firstHalfNeed - a.firstHalfNeed);

  for (const pos of DEFENSIVE_POSITIONS) {
    if (filled.has(pos)) continue;
    const next = benchPool.shift();
    if (!next) break;
    result.push({ playerId: next.id, position: pos, reason: 'Auto sub.' });
    filled.add(pos);
  }
  return result;
}

void INFIELD;
void OUTFIELD;
