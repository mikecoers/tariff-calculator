import type { SeasonSettings } from '@/types';
import { restDaysForPitches } from '@/features/rules/pitchingRules';

interface Props {
  pitches: number;
  tiers: SeasonSettings['pitchCountRestTiers'];
  compact?: boolean;
}

/**
 * Given a current pitch count, tells the coach what they get if they
 * pull the pitcher right now, and where the next cliff is.
 */
export default function PitchRestAlert({ pitches, tiers, compact = false }: Props) {
  const currentRest = restDaysForPitches(pitches, tiers);
  const currentTier = tiers.find((t) => pitches <= t.maxPitches);
  const nextTier = tiers.find((t) => t.maxPitches > (currentTier?.maxPitches ?? 0));
  const nextCliff = currentTier && Number.isFinite(currentTier.maxPitches) ? currentTier.maxPitches : null;
  const pitchesUntilCliff = nextCliff != null ? nextCliff - pitches : null;

  const tone =
    currentRest === 0
      ? 'ok'
      : currentRest === 1
      ? 'info'
      : currentRest === 2
      ? 'warn'
      : 'crit';

  const toneClasses =
    tone === 'ok'
      ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
      : tone === 'info'
      ? 'bg-sky-50 border-sky-700 text-sky-900'
      : tone === 'warn'
      ? 'bg-amber-50 border-amber-700 text-amber-900'
      : 'bg-red-50 border-red-700 text-red-900';

  const restLabel = currentRest === 0 ? 'No rest' : `${currentRest} day${currentRest === 1 ? '' : 's'} rest`;

  if (compact) {
    return (
      <div className={`rounded-lg border px-2 py-1 text-[11px] font-bold flex items-center gap-1 ${toneClasses}`}>
        <span className="font-black">Pull now → {restLabel}</span>
        {pitchesUntilCliff != null && nextTier && (
          <span className="opacity-75 font-semibold">
            · {pitchesUntilCliff} more = {nextTier.restDays}d
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border-2 px-3 py-2 ${toneClasses}`}>
      <div className="text-[10px] uppercase tracking-widest font-black">
        Pitch-count strategy
      </div>
      <div className="text-[14px] font-black mt-0.5">
        Pull now → <span className="underline">{restLabel}</span>
      </div>
      {pitchesUntilCliff != null && nextTier && (
        <div className="text-[11px] font-bold mt-0.5 opacity-90">
          {pitchesUntilCliff === 0 ? (
            <>One more pitch bumps to {nextTier.restDays} day{nextTier.restDays === 1 ? '' : 's'}.</>
          ) : (
            <>
              {pitchesUntilCliff} more pitch{pitchesUntilCliff === 1 ? '' : 'es'} and it's{' '}
              {nextTier.restDays} day{nextTier.restDays === 1 ? '' : 's'}.
            </>
          )}
        </div>
      )}
    </div>
  );
}
