import { useEffect, useState } from 'react';
import Modal from './Modal';
import { playersRepo } from '@/db/repositories';
import type { Player } from '@/types';

interface Props {
  open: boolean;
  title?: string;
  onClose: () => void;
  onPick: (playerId: string, age: number) => void;
  players: Player[];
  allowDismiss?: boolean;
}

export default function PitcherPicker({ open, onClose, onPick, players, title = 'Pick pitcher', allowDismiss = true }: Props) {
  const [step, setStep] = useState<'pick' | 'age'>('pick');
  const [selected, setSelected] = useState<Player | null>(null);
  const [age, setAge] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setStep('pick');
      setSelected(null);
      setAge(null);
    }
  }, [open]);

  const confirm = async () => {
    if (!selected || age == null) return;
    if (selected.age !== age) {
      await playersRepo.update(selected.id, { age });
    }
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
        ) : (
          allowDismiss ? (
            <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={onClose}>
              Cancel
            </button>
          ) : null
        )
      }
    >
      {step === 'pick' && (
        <>
          <p className="text-xs text-ump-dim mb-2">
            Tap a player to make them the pitcher. You'll confirm or update their age on the next step —
            that's what sets the daily pitch cap (7–8: 50, 9–10: 75, 11–12: 85).
          </p>
          <ul className="space-y-1 max-h-[58vh] overflow-auto">
            {players.map((p) => (
              <li key={p.id}>
                <button
                  className="tap-btn tap-btn-neutral tap-btn-lg w-full justify-between"
                  onClick={() => {
                    setSelected(p);
                    setAge(p.age ?? null);
                    setStep('age');
                  }}
                >
                  <span className="truncate">{p.displayName}</span>
                  <span className={`text-xs ml-2 ${p.age != null ? 'text-ump-dim' : 'text-ump-warn'}`}>
                    {p.age != null ? `age ${p.age}` : 'needs age'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {step === 'age' && (
        <div>
          <p className="text-xs text-ump-dim mb-2">
            Select their age. This controls the daily pitch cap and rest days.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[7, 8, 9, 10, 11, 12].map((n) => {
              const on = age === n;
              return (
                <button
                  key={n}
                  className={`tap-btn tap-btn-lg ${on ? 'tap-btn-primary' : 'tap-btn-neutral'}`}
                  onClick={() => setAge(n)}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-2xl leading-none">{n}</span>
                    <span className="text-[10px] font-semibold text-ump-bg/70 mt-0.5">
                      {n <= 8 ? '50 max' : n <= 10 ? '75 max' : '85 max'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {age != null && (
            <div className="mt-3 rounded-xl bg-ump-bg2 border border-ump-line p-3 text-sm">
              <div className="field-label mb-1">Daily cap</div>
              <div className="text-xl font-bold">
                {age <= 8 ? 50 : age <= 10 ? 75 : 85} pitches
              </div>
              <div className="text-xs text-ump-dim mt-0.5">
                Rest tiers: 0d ≤20 · 1d 21–35 · 2d 36–50 · 3d 51–65 · 4d 66+
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
