import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { useApp } from '@/app/AppContext';
import { pitcherAppearancesRepo, playersRepo } from '@/db/repositories';
import { pitcherEligibilityFromHistory } from '@/features/rules/pitchingRules';
import type { PitcherAppearance, Player } from '@/types';

export default function PitchersScreen() {
  const { team, settings } = useApp();
  const [players, setPlayers] = useState<Player[]>([]);
  const [appearancesByPlayer, setAppearancesByPlayer] = useState<Record<string, PitcherAppearance[]>>({});

  useEffect(() => {
    if (!team) return;
    void (async () => {
      const ps = await playersRepo.activeByTeam(team.id);
      setPlayers(ps);
      const map: Record<string, PitcherAppearance[]> = {};
      for (const p of ps) {
        map[p.id] = await pitcherAppearancesRepo.forPlayer(p.id);
      }
      setAppearancesByPlayer(map);
    })();
  }, [team]);

  if (!team || !settings) return <div className="p-4">Create a team first.</div>;

  const today = Date.now();

  return (
    <div className="pb-24">
      <Header title="Pitchers" subtitle="Rest tracker" />
      <div className="p-4 space-y-2 max-w-2xl mx-auto">
        {players.length === 0 && <p className="text-ump-dim">Add players to see pitch tracking.</p>}
        {players.map((p) => {
          const appearances = appearancesByPlayer[p.id] ?? [];
          const eligibility = pitcherEligibilityFromHistory(p.id, today, appearances, settings);
          const totalPitches = appearances.reduce((s, a) => s + a.pitchesThrown, 0);
          return (
            <div key={p.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{p.displayName}</div>
                  <div className="text-xs text-ump-dim">
                    {appearances.length} outings · {totalPitches} total pitches
                  </div>
                </div>
                {eligibility.eligibleToday ? (
                  <span className="chip-ok">Eligible</span>
                ) : (
                  <span className="chip-crit">
                    Rest until {new Date(eligibility.eligibleOn).toLocaleDateString()}
                  </span>
                )}
              </div>
              {eligibility.reason && <div className="text-xs mt-1 text-ump-warn">{eligibility.reason}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
