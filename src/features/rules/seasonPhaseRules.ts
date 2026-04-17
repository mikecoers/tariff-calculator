import type { SeasonSettings } from '@/types';

export interface PhaseGate {
  allowed: boolean;
  reason?: string;
}

export function canWalk(settings: SeasonSettings, basesLoaded: boolean): PhaseGate {
  if (settings.allowWalks) return { allowed: true };
  if (settings.seasonPhase === 'mid' && basesLoaded) return { allowed: true };
  return { allowed: false, reason: 'Walks not allowed in this season phase.' };
}

export function canStealBase(settings: SeasonSettings, toBase: 2 | 3 | 'home', managerPitching: boolean): PhaseGate {
  if (!settings.allowSteals && settings.seasonPhase !== 'end' && settings.seasonPhase !== 'mid') {
    return { allowed: false, reason: 'Stealing not allowed in early-season phase.' };
  }
  if (toBase === 'home' && !settings.allowStealHome) {
    return { allowed: false, reason: 'Stealing home not allowed.' };
  }
  if (managerPitching && settings.seasonPhase === 'mid') {
    return { allowed: false, reason: 'No stealing while manager is pitching.' };
  }
  return { allowed: true };
}

export function canManagerPitch(settings: SeasonSettings): PhaseGate {
  if (settings.seasonPhase === 'end') return { allowed: false, reason: 'End-of-season: no manager pitching.' };
  if (!settings.allowManagerPitch) return { allowed: false, reason: 'Manager pitching disabled in settings.' };
  return { allowed: true };
}

export function describePhase(phase: SeasonSettings['seasonPhase']): { label: string; description: string } {
  switch (phase) {
    case 'early':
      return {
        label: 'Early Season',
        description: 'Coach-pitch remainder, no walks, no stealing home.'
      };
    case 'mid':
      return {
        label: 'Mid Season',
        description: 'Walks with bases loaded, stealing OK (except on manager pitch).'
      };
    case 'end':
      return {
        label: 'End Season',
        description: 'Full walks and stealing. No manager pitching.'
      };
  }
}
