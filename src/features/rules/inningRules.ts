import type { Game, SeasonSettings } from '@/types';

export function inningRunCapReached(game: Game, settings: SeasonSettings): boolean {
  if (settings.lastInningRunsUncapped && game.inning >= settings.maxInnings) return false;
  return game.runsThisInning >= settings.runsPerInningLimit;
}

export function runsRemainingThisInning(game: Game, settings: SeasonSettings): number | null {
  if (settings.lastInningRunsUncapped && game.inning >= settings.maxInnings) return null;
  return Math.max(0, settings.runsPerInningLimit - game.runsThisInning);
}

export function shouldEndHalfInning(game: Game, settings: SeasonSettings): boolean {
  if (game.outs >= 3) return true;
  if (inningRunCapReached(game, settings)) return true;
  return false;
}

export function nextHalfInning(game: Game): { inning: number; halfInning: 'top' | 'bottom' } {
  if (game.halfInning === 'top') return { inning: game.inning, halfInning: 'bottom' };
  return { inning: game.inning + 1, halfInning: 'top' };
}

export function isGameOver(game: Game, settings: SeasonSettings): boolean {
  if (game.status === 'completed' || game.status === 'archived') return true;
  if (game.inning > settings.maxInnings) return true;
  if (game.inning === settings.maxInnings && game.halfInning === 'bottom' && game.outs >= 3) return true;
  return false;
}
