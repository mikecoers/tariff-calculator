import { useMemo } from 'react';
import Modal from './Modal';
import type { AtBat, DefensiveAssignment, GameLineup, Player, Position } from '@/types';
import { haptic } from '@/lib/haptics';

interface Props {
  open: boolean;
  onClose: () => void;
  lineup: GameLineup | undefined;
  playersById: Map<string, Player>;
  atBats: AtBat[];
  defenseThisInning: DefensiveAssignment[];
  inningDefenseCounts: Map<string, number>;
  currentBatterSlot: number;
  onReorder?: (from: number, to: number) => void;
}

interface RowStats {
  ab: number;
  hits: number;
  walks: number;
  strikeouts: number;
  rbis: number;
  runs: number;
}

function computeStats(atBats: AtBat[], playerId: string): RowStats {
  let ab = 0, hits = 0, walks = 0, strikeouts = 0, rbis = 0, runs = 0;
  for (const a of atBats) {
    if (a.batterPlayerId !== playerId) continue;
    if (a.resultType === 'walk' || a.resultType === 'hbp') walks += 1;
    else if (a.resultType === 'other') continue;
    else ab += 1;
    if (['single', 'double', 'triple', 'hr'].includes(a.resultType)) hits += 1;
    if (a.resultType === 'strikeout') strikeouts += 1;
    rbis += a.rbis || 0;
    runs += a.runsScored || 0;
  }
  return { ab, hits, walks, strikeouts, rbis, runs };
}

export default function Lineup({
  open,
  onClose,
  lineup,
  playersById,
  atBats,
  defenseThisInning,
  inningDefenseCounts,
  currentBatterSlot,
  onReorder
}: Props) {
  const posByPlayer = useMemo(() => {
    const m = new Map<string, Position>();
    for (const d of defenseThisInning) m.set(d.playerId, d.position);
    return m;
  }, [defenseThisInning]);

  if (!lineup) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Batting Order"
      footer={<button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={onClose}>Close</button>}
    >
      <p className="text-xs text-phil-maroon/70 mb-2">
        ● = at bat · ◐ = on deck · ◑ = in the hole. Use arrows to reorder.
      </p>
      <ol className="divide-y divide-phil-blueDeep/40">
        {lineup.battingOrder.map((pid, idx) => {
          const p = playersById.get(pid);
          if (!p) return null;
          const stats = computeStats(atBats, pid);
          const pos = posByPlayer.get(pid);
          const isBatter = idx === currentBatterSlot;
          const isOnDeck = idx === (currentBatterSlot + 1) % lineup.battingOrder.length;
          const isInHole = idx === (currentBatterSlot + 2) % lineup.battingOrder.length;
          const defInnings = inningDefenseCounts.get(pid) ?? 0;
          return (
            <li
              key={pid}
              className={`py-2 flex items-center gap-2 ${
                isBatter ? 'bg-phil-maroon/10 border-l-4 border-phil-maroon pl-2 -ml-2 rounded-r-lg' : ''
              }`}
            >
              <div
                className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-sm font-black border ${
                  isBatter
                    ? 'bg-phil-maroon text-phil-cream border-phil-maroon'
                    : isOnDeck
                    ? 'bg-phil-blueLight text-phil-maroon border-phil-maroon/60'
                    : 'bg-white text-phil-maroon border-phil-blueDeep'
                }`}
              >
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-bold truncate">{p.displayName}</div>
                  {pos && <span className="chip-maroon">{pos}</span>}
                  {isBatter && <span className="chip-maroon animate-pulse-slow">AT BAT</span>}
                  {isOnDeck && <span className="chip-info">ON DECK</span>}
                  {isInHole && <span className="chip-info opacity-70">IN HOLE</span>}
                </div>
                <div className="text-[11px] text-phil-maroon/70 flex gap-2 mt-0.5">
                  <span>
                    {stats.ab > 0 ? `${stats.hits}/${stats.ab}` : '—'}
                  </span>
                  {stats.walks > 0 && <span>{stats.walks}BB</span>}
                  {stats.strikeouts > 0 && <span>{stats.strikeouts}K</span>}
                  {stats.rbis > 0 && <span>{stats.rbis}RBI</span>}
                  {stats.runs > 0 && <span>{stats.runs}R</span>}
                  <span className="ml-auto text-phil-maroon/60">{defInnings}def</span>
                </div>
              </div>
              {onReorder && (
                <div className="flex flex-col gap-0.5">
                  <button
                    className="h-5 w-5 rounded bg-phil-blueLight border border-phil-blueDeep text-phil-maroon text-xs disabled:opacity-40"
                    disabled={idx === 0}
                    onClick={() => {
                      haptic('light');
                      onReorder(idx, idx - 1);
                    }}
                    aria-label="Move up"
                  >
                    ▲
                  </button>
                  <button
                    className="h-5 w-5 rounded bg-phil-blueLight border border-phil-blueDeep text-phil-maroon text-xs disabled:opacity-40"
                    disabled={idx === lineup.battingOrder.length - 1}
                    onClick={() => {
                      haptic('light');
                      onReorder(idx, idx + 1);
                    }}
                    aria-label="Move down"
                  >
                    ▼
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </Modal>
  );
}
