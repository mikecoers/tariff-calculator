import type { PitcherAppearance, SeasonSettings } from '@/types';

export interface PitchLimitStatus {
  pitchesThrown: number;
  dailyMax: number;
  remaining: number;
  tier: 'green' | 'yellow' | 'red' | 'over';
  restDaysIfStopNow: number;
}

export function restDaysForPitches(
  pitches: number,
  tiers: SeasonSettings['pitchCountRestTiers']
): number {
  for (const t of tiers) {
    if (pitches <= t.maxPitches) return t.restDays;
  }
  return tiers[tiers.length - 1]?.restDays ?? 4;
}

export function pitchesUntilNextRestTier(
  pitches: number,
  tiers: SeasonSettings['pitchCountRestTiers']
): { nextTierAt: number; nextRestDays: number } | null {
  for (const t of tiers) {
    if (pitches <= t.maxPitches && Number.isFinite(t.maxPitches)) {
      return { nextTierAt: t.maxPitches + 1, nextRestDays: restDaysForPitches(t.maxPitches + 1, tiers) };
    }
  }
  return null;
}

export function dailyMaxForAge(age: number | undefined, settings: SeasonSettings): number {
  if (age == null) return 85;
  const key = String(age);
  return settings.pitchCountLimitByAge[key] ?? 85;
}

export function pitchLimitStatus(
  pitches: number,
  age: number | undefined,
  settings: SeasonSettings
): PitchLimitStatus {
  const dailyMax = dailyMaxForAge(age, settings);
  const remaining = Math.max(0, dailyMax - pitches);
  const ratio = dailyMax > 0 ? pitches / dailyMax : 0;
  const tier: PitchLimitStatus['tier'] =
    pitches > dailyMax ? 'over' : ratio >= 0.95 ? 'red' : ratio >= 0.8 ? 'yellow' : 'green';
  return {
    pitchesThrown: pitches,
    dailyMax,
    remaining,
    tier,
    restDaysIfStopNow: restDaysForPitches(pitches, settings.pitchCountRestTiers)
  };
}

export interface PitcherEligibility {
  playerId: string;
  eligibleOn: number;
  eligibleToday: boolean;
  reason?: string;
  recentPitches?: number;
  restDaysRequired?: number;
}

export function pitcherEligibilityFromHistory(
  playerId: string,
  gameDate: number,
  appearances: PitcherAppearance[],
  settings: SeasonSettings
): PitcherEligibility {
  const history = [...appearances]
    .filter((a) => a.playerId === playerId)
    .sort((a, b) => b.date - a.date);
  if (history.length === 0) {
    return { playerId, eligibleOn: gameDate, eligibleToday: true };
  }
  const last = history[0];
  const daysRequired = last.restDaysRequired;
  const eligibleOn = last.date + daysRequired * 24 * 60 * 60 * 1000;
  const eligibleToday = gameDate >= eligibleOn;
  return {
    playerId,
    eligibleOn,
    eligibleToday,
    recentPitches: last.pitchesThrown,
    restDaysRequired: daysRequired,
    reason: eligibleToday
      ? undefined
      : `Needs ${daysRequired} rest day${daysRequired === 1 ? '' : 's'} after ${last.pitchesThrown} pitches.`
  };
}

export function consecutiveDaysPitched(
  playerId: string,
  gameDate: number,
  appearances: PitcherAppearance[]
): number {
  const days = new Set<string>();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  let count = 0;
  let check = gameDate - ONE_DAY;
  for (let i = 0; i < 7; i++) {
    const key = new Date(check).toDateString();
    const matched = appearances.find(
      (a) => a.playerId === playerId && new Date(a.date).toDateString() === key && a.pitchesThrown > 0
    );
    if (!matched) break;
    if (!days.has(key)) {
      days.add(key);
      count++;
    }
    check -= ONE_DAY;
  }
  return count;
}
