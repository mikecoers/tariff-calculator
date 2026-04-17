import type { DefensiveAssignment, SeasonSettings } from '@/types';

export interface CatcherTransitionIssue {
  blocked: boolean;
  reason?: string;
}

export function catcherToPitcherSameInning(
  assignments: DefensiveAssignment[],
  playerId: string,
  inning: number,
  settings: SeasonSettings
): CatcherTransitionIssue {
  if (settings.catcherToPitcherSameInningAllowed) return { blocked: false };
  const caughtSameInning = assignments.some(
    (a) => a.playerId === playerId && a.inning === inning && a.position === 'C'
  );
  if (caughtSameInning) {
    return {
      blocked: true,
      reason: 'Player caught this inning — cannot pitch same inning per rule.'
    };
  }
  return { blocked: false };
}

export function catcherInningsPitched3Plus(
  assignments: DefensiveAssignment[],
  playerId: string
): { caughtInnings: number; blocked: boolean } {
  const caught = assignments.filter((a) => a.playerId === playerId && a.position === 'C').length;
  return { caughtInnings: caught, blocked: caught >= 3 };
}
