import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import { useApp } from '@/app/AppContext';
import { atBatsRepo, defenseRepo, gamesRepo, playersRepo } from '@/db/repositories';
import type { AtBat, DefensiveAssignment, Game, Player } from '@/types';

interface Row {
  player: Player;
  games: number;
  ab: number;
  hits: number;
  runs: number;
  rbis: number;
  walks: number;
  strikeouts: number;
  defensiveInnings: number;
}

export default function StatsScreen() {
  const { team } = useApp();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!team) return;
    void (async () => {
      const players = await playersRepo.byTeam(team.id);
      const games = await gamesRepo.byTeam(team.id);
      const completed = games.filter((g) => g.status === 'completed');
      const allAB: AtBat[] = [];
      const allDef: DefensiveAssignment[] = [];
      const gameAppearances = new Map<string, Set<Game['id']>>();
      for (const g of completed) {
        allAB.push(...(await atBatsRepo.forGame(g.id)));
        allDef.push(...(await defenseRepo.forGame(g.id)));
      }
      for (const d of allDef) {
        let set = gameAppearances.get(d.playerId);
        if (!set) { set = new Set(); gameAppearances.set(d.playerId, set); }
        set.add(d.gameId);
      }
      const byPlayer = new Map<string, Row>();
      for (const p of players) {
        byPlayer.set(p.id, {
          player: p,
          games: gameAppearances.get(p.id)?.size ?? 0,
          ab: 0,
          hits: 0,
          runs: 0,
          rbis: 0,
          walks: 0,
          strikeouts: 0,
          defensiveInnings: 0
        });
      }
      for (const a of allAB) {
        const r = byPlayer.get(a.batterPlayerId);
        if (!r) continue;
        if (a.resultType === 'walk' || a.resultType === 'hbp') r.walks += 1;
        else r.ab += 1;
        if (['single','double','triple','hr'].includes(a.resultType)) r.hits += 1;
        if (a.resultType === 'strikeout') r.strikeouts += 1;
        r.runs += a.runsScored;
        r.rbis += a.rbis;
      }
      for (const d of allDef) {
        const r = byPlayer.get(d.playerId);
        if (!r) continue;
        if (d.position !== 'BN' && d.position !== 'EH') r.defensiveInnings += 1;
      }
      setRows(Array.from(byPlayer.values()).sort((a, b) => b.hits - a.hits));
    })();
  }, [team]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.ab += r.ab;
        acc.hits += r.hits;
        acc.runs += r.runs;
        acc.rbis += r.rbis;
        return acc;
      },
      { ab: 0, hits: 0, runs: 0, rbis: 0 }
    );
  }, [rows]);

  return (
    <div className="pb-24">
      <Header title="Season stats" />
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        <div className="card">
          <div className="field-label">Team totals</div>
          <div className="text-sm mt-1 flex gap-4">
            <span>AB {totals.ab}</span>
            <span>H {totals.hits}</span>
            <span>R {totals.runs}</span>
            <span>RBI {totals.rbis}</span>
            <span>AVG {totals.ab > 0 ? (totals.hits / totals.ab).toFixed(3) : '—'}</span>
          </div>
        </div>
        <div className="overflow-x-auto card p-0">
          <table className="w-full text-sm">
            <thead className="bg-ump-bg text-ump-dim">
              <tr>
                <th className="text-left px-3 py-2">Player</th>
                <th className="text-right px-2 py-2">G</th>
                <th className="text-right px-2 py-2">AB</th>
                <th className="text-right px-2 py-2">H</th>
                <th className="text-right px-2 py-2">R</th>
                <th className="text-right px-2 py-2">RBI</th>
                <th className="text-right px-2 py-2">BB</th>
                <th className="text-right px-2 py-2">K</th>
                <th className="text-right px-2 py-2">AVG</th>
                <th className="text-right px-2 py-2">Def In</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.player.id} className="border-t border-ump-line">
                  <td className="px-3 py-2 font-semibold">{r.player.displayName}</td>
                  <td className="text-right">{r.games}</td>
                  <td className="text-right">{r.ab}</td>
                  <td className="text-right">{r.hits}</td>
                  <td className="text-right">{r.runs}</td>
                  <td className="text-right">{r.rbis}</td>
                  <td className="text-right">{r.walks}</td>
                  <td className="text-right">{r.strikeouts}</td>
                  <td className="text-right">{r.ab > 0 ? (r.hits / r.ab).toFixed(3) : '—'}</td>
                  <td className="text-right">{r.defensiveInnings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
