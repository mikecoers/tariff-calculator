import { useEffect, useState } from 'react';
import Modal from './Modal';
import { pitcherAppearancesRepo, playersRepo } from '@/db/repositories';
import { pitcherEligibilityFromHistory } from '@/features/rules/pitchingRules';
import { useApp } from '@/app/AppContext';
import { haptic } from '@/lib/haptics';
import type { Player, PitcherAppearance } from '@/types';

interface Props {
  open: boolean;
  title?: string;
  onClose: () => void;
  onPick: (playerId: string, age: number) => void;
  players: Player[];
  gameDate: number;
  allowDismiss?: boolean;
}

interface Elig {
  eligible: boolean;
  reason?: string;
  eligibleOn?: number;
}

export default function PitcherPicker({
  open,
  onClose,
  onPick,
  players,
  title = 'Pick pitcher',
  gameDate,
  allowDismiss = true
}: Props) {
  const { settings } = useApp();
  const [step, setStep] = useState<'pick' | 'age'>('pick');
  const [selected, setSelected] = useState<Player | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [eligibility, setEligibility] = useState<Record<string, Elig>>({});
  const [override, setOverride] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('pick');
    setSelected(null);
    setAge(null);
    setOverride(false);
    if (!settings) return;
    void (async () => {
      const map: Record<string, Elig> = {};
      for (const p of players) {
        const history = await pitcherAppearancesRepo.forPlayer(p.id);
        const elig = pitcherEligibilityFromHistory(p.id, gameDate, history, settings);
        map[p.id] = { eligible: elig.eligibleToday, reason: elig.reason, eligibleOn: elig.eligibleOn };
      }
      setEligibility(map);
    })();
  }, [open, players, settings, gameDate]);

  const confirm = async () => {
    if (!selected || age == null) return;
    if (selected.age !== age) {
      await playersRepo.update(selected.id, { age });
    }
    haptic('medium');
    onPick(selected.id, age);
  };

  return (
    <Modal
      open={open}
      onClose={allowDismiss ? onClose : () => {}}
      title={step === 'pick' ? title : `${selected?.displayName ?? 'Pitcher'} — set age`}
      footer={
        step === 'age' ? (
          <>
            <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => setStep('pick')}>
              Back
            </button>
            <button className="tap-btn tap-btn-primary tap-btn-sm" disabled={age == null} onClick={confirm}>
              Start counting
            </button>
          </>
        ) : allowDismiss ? (
          <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={onClose}>
            Cancel
          </button>
        ) : null
      }
    >
      {step === 'pick' && (
        <>
          <p className="text-xs text-phil-creamDim mb-2">
            Tap a pitcher. Next step sets age, which drives the daily cap (50/75/85).
          </p>
          {!override && players.some((p) => eligibility[p.id]?.eligible === false) && (
            <label className="flex items-center gap-2 text-[11px] text-phil-creamDim mb-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                onChange={(e) => setOverride(e.target.checked)}
              />
              Show ineligible pitchers anyway (override rest rule)
            </label>
          )}
          <ul className="space-y-1 max-h-[58vh] overflow-auto">
            {players.map((p) => {
              const elig = eligibility[p.id];
              const ineligible = elig && !elig.eligible;
              if (ineligible && !override) {
                return (
                  <li key={p.id}>
                    <button
                      disabled
                      className="w-full rounded-xl border border-ump-crit/40 bg-ump-crit/10 text-phil-creamDim px-3 py-3 flex items-center justify-between opacity-80"
                    >
                      <span className="truncate">{p.displayName}</span>
                      <span className="chip-crit">
                        REST · eligible {elig.eligibleOn ? new Date(elig.eligibleOn).toLocaleDateString() : '—'}
                      </span>
                    </button>
                  </li>
                );
              }
              return (
                <li key={p.id}>
                  <button
                    className="tap-btn tap-btn-neutral tap-btn-lg w-full justify-between"
                    onClick={() => {
                      haptic('light');
                      setSelected(p);
                      setAge(p.age ?? null);
                      setStep('age');
                    }}
                  >
                    <span className="truncate">{p.displayName}</span>
                    <span className="flex items-center gap-1">
                      {elig?.eligible ? <span className="chip-ok">ELIGIBLE</span> : null}
                      {ineligible && override ? <span className="chip-crit">OVERRIDE</span> : null}
                      <span className={`text-xs ${p.age != null ? 'text-phil-creamDim' : 'text-ump-warn'}`}>
                        {p.age != null ? `age ${p.age}` : 'needs age'}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {step === 'age' && (
        <div>
          <p className="text-xs text-phil-creamDim mb-2">
            Select age — drives the daily pitch cap.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[7, 8, 9, 10, 11, 12].map((n) => {
              const on = age === n;
              return (
                <button
                  key={n}
                  className={`tap-btn tap-btn-lg ${on ? 'tap-btn-primary' : 'tap-btn-neutral'}`}
                  onClick={() => {
                    haptic('light');
                    setAge(n);
                  }}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-2xl leading-none">{n}</span>
                    <span className="text-[10px] font-semibold opacity-70 mt-0.5">
                      {n <= 8 ? '50 max' : n <= 10 ? '75 max' : '85 max'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {age != null && (
            <div className="mt-3 rounded-xl bg-phil-maroonDarker border border-ump-line p-3 text-sm">
              <div className="field-label mb-1">Daily cap</div>
              <div className="text-xl font-bold">{age <= 8 ? 50 : age <= 10 ? 75 : 85} pitches</div>
              <div className="text-xs text-phil-creamDim mt-0.5">
                Rest: 0d ≤20 · 1d 21–35 · 2d 36–50 · 3d 51–65 · 4d 66+
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// keep import usage if tree-shaken
void (pitcherAppearancesRepo as unknown as PitcherAppearance[]);
