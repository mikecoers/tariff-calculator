import type { SeasonSettings } from '@/types';
import { newId, now } from '@/lib/id';

export const DEFAULT_PITCH_REST_TIERS: SeasonSettings['pitchCountRestTiers'] = [
  { maxPitches: 20, restDays: 0 },
  { maxPitches: 35, restDays: 1 },
  { maxPitches: 50, restDays: 2 },
  { maxPitches: 65, restDays: 3 },
  { maxPitches: Infinity, restDays: 4 }
];

export const DEFAULT_PITCH_COUNT_BY_AGE: Record<string, number> = {
  '7': 50,
  '8': 50,
  '9': 75,
  '10': 75,
  '11': 85,
  '12': 85
};

export function defaultSeasonSettings(teamId: string, seasonYear: number): SeasonSettings {
  return {
    id: newId('ss'),
    teamId,
    seasonYear,
    seasonPhase: 'early',
    maxInnings: 6,
    runsPerInningLimit: 5,
    lastInningRunsUncapped: true,
    minDefensiveInnings: 4,
    minFirstHalfInnings: 2,
    firstHalfInningBoundary: 4,
    catcherToPitcherSameInningAllowed: false,
    allowManagerPitch: true,
    pitchCountLimitByAge: { ...DEFAULT_PITCH_COUNT_BY_AGE },
    pitchCountRestTiers: DEFAULT_PITCH_REST_TIERS.map((t) => ({ ...t })),
    allowWalks: false,
    allowSteals: false,
    allowStealHome: false,
    dhEnabled: false,
    updatedAt: now()
  };
}

export function applySeasonPhaseDefaults(
  settings: SeasonSettings,
  phase: SeasonSettings['seasonPhase']
): SeasonSettings {
  switch (phase) {
    case 'early':
      return {
        ...settings,
        seasonPhase: 'early',
        allowWalks: false,
        allowSteals: false,
        allowStealHome: false,
        allowManagerPitch: true,
        updatedAt: now()
      };
    case 'mid':
      return {
        ...settings,
        seasonPhase: 'mid',
        allowWalks: true,
        allowSteals: true,
        allowStealHome: true,
        allowManagerPitch: true,
        updatedAt: now()
      };
    case 'end':
      return {
        ...settings,
        seasonPhase: 'end',
        allowWalks: true,
        allowSteals: true,
        allowStealHome: true,
        allowManagerPitch: false,
        updatedAt: now()
      };
  }
}
