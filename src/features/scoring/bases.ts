import type { AtBatResult, ID } from '@/types';

export interface BaseState {
  first: ID | null;
  second: ID | null;
  third: ID | null;
}

export interface AdvanceResult {
  bases: BaseState;
  runs: number;
  scored: ID[];
}

export const emptyBases = (): BaseState => ({ first: null, second: null, third: null });

export function advanceRunners(bases: BaseState, result: AtBatResult, batterId: ID | null): AdvanceResult {
  let { first, second, third } = bases;
  const scored: ID[] = [];
  const score = (runner: ID | null) => {
    if (runner) scored.push(runner);
  };

  switch (result) {
    case 'single': {
      score(third);
      third = second;
      second = first;
      first = batterId;
      break;
    }
    case 'double': {
      score(third);
      score(second);
      third = first;
      second = batterId;
      first = null;
      break;
    }
    case 'triple': {
      score(third);
      score(second);
      score(first);
      third = batterId;
      second = null;
      first = null;
      break;
    }
    case 'hr': {
      score(third);
      score(second);
      score(first);
      score(batterId);
      first = null;
      second = null;
      third = null;
      break;
    }
    case 'walk':
    case 'hbp': {
      // force runners only when forced
      if (first && second && third) {
        score(third);
        third = second;
        second = first;
      } else if (first && second) {
        third = second;
        second = first;
      } else if (first) {
        second = first;
      }
      first = batterId;
      break;
    }
    case 'error': {
      // treat like single without RBI implication
      score(third);
      third = second;
      second = first;
      first = batterId;
      break;
    }
    case 'sac': {
      // sac fly: runner on third scores, others hold; sac bunt: all advance
      if (third) {
        score(third);
        third = null;
      } else if (first || second) {
        third = second;
        second = first;
        first = null;
      }
      break;
    }
    case 'fc': {
      // fielder's choice: lead runner out, batter to first
      if (third) third = null;
      else if (second) second = null;
      else if (first) first = null;
      // then push batter in
      if (first) second = first;
      first = batterId;
      break;
    }
    case 'strikeout':
    case 'groundout':
    case 'flyout':
    case 'other':
    default:
      break;
  }

  return { bases: { first, second, third }, runs: scored.length, scored };
}

export function countBaserunners(bases: BaseState): number {
  return [bases.first, bases.second, bases.third].filter(Boolean).length;
}

export function basesLoaded(bases: BaseState): boolean {
  return !!(bases.first && bases.second && bases.third);
}
