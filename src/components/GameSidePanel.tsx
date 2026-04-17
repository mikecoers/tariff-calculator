import type { DefensiveAssignment, GameLineup, Player, Position } from '@/types';
import { DEFENSIVE_POSITIONS } from '@/types';

interface Props {
  mode: 'bat' | 'defense';
  lineup?: GameLineup;
  playersById: Map<string, Player>;
  defense: DefensiveAssignment[];
  currentBatterSlot: number;
  currentPitcherId?: string;
  absentIds: string[];
  allPlayers: Player[];
  currentInning: number;
}

export default function GameSidePanel({
  mode,
  lineup,
  playersById,
  defense,
  currentBatterSlot,
  currentPitcherId,
  absentIds,
  allPlayers,
  currentInning
}: Props) {
  if (mode === 'bat') {
    return <BattingSide lineup={lineup} playersById={playersById} currentBatterSlot={currentBatterSlot} />;
  }
  return (
    <DefenseSide
      defense={defense.filter((d) => d.inning === currentInning)}
      playersById={playersById}
      allPlayers={allPlayers}
      currentPitcherId={currentPitcherId}
      absentIds={absentIds}
    />
  );
}

function BattingSide({
  lineup,
  playersById,
  currentBatterSlot
}: {
  lineup?: GameLineup;
  playersById: Map<string, Player>;
  currentBatterSlot: number;
}) {
  if (!lineup) return null;
  const len = lineup.battingOrder.length;
  return (
    <div className="glass-solid rounded-2xl p-1.5 h-full flex flex-col overflow-hidden">
      <div className="text-[10px] uppercase tracking-widest font-black text-phil-maroonDark text-center py-0.5">
        BATTING
      </div>
      <ul className="flex-1 overflow-y-auto space-y-0.5">
        {lineup.battingOrder.map((pid, idx) => {
          const p = playersById.get(pid);
          if (!p) return null;
          const isBatter = idx === currentBatterSlot;
          const isOnDeck = idx === (currentBatterSlot + 1) % len;
          const isInHole = idx === (currentBatterSlot + 2) % len;
          return (
            <li
              key={pid}
              className={`flex items-center gap-1 rounded-md px-1.5 py-1 ${
                isBatter
                  ? 'bg-phil-maroon text-phil-cream shadow'
                  : isOnDeck
                  ? 'bg-amber-200 text-phil-maroonDark'
                  : 'text-phil-maroonDark'
              }`}
            >
              <span
                className={`w-5 text-center text-[10px] font-black ${
                  isBatter ? 'text-phil-cream' : 'text-phil-maroon'
                }`}
              >
                {idx + 1}
              </span>
              <span className="text-[11px] font-bold truncate flex-1">{p.displayName}</span>
              {isBatter && <span className="text-[9px]">⚾</span>}
              {isInHole && <span className="text-[8px] opacity-60">⋯</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DefenseSide({
  defense,
  playersById,
  allPlayers,
  currentPitcherId,
  absentIds
}: {
  defense: DefensiveAssignment[];
  playersById: Map<string, Player>;
  allPlayers: Player[];
  currentPitcherId?: string;
  absentIds: string[];
}) {
  const posMap = new Map<Position, string>();
  for (const d of defense) posMap.set(d.position, d.playerId);

  const assigned = new Set(defense.map((d) => d.playerId));
  const bench = allPlayers.filter(
    (p) => p.active && !assigned.has(p.id) && !absentIds.includes(p.id)
  );

  return (
    <div className="glass-solid rounded-2xl p-1.5 h-full flex flex-col overflow-hidden">
      <div className="text-[10px] uppercase tracking-widest font-black text-phil-maroonDark text-center py-0.5">
        DEFENSE
      </div>
      <ul className="space-y-0.5">
        {DEFENSIVE_POSITIONS.map((pos) => {
          const pid = posMap.get(pos);
          const p = pid ? playersById.get(pid) : undefined;
          const isPitcher = pid === currentPitcherId;
          return (
            <li
              key={pos}
              className={`flex items-center gap-1 rounded-md px-1.5 py-1 ${
                isPitcher
                  ? 'bg-phil-maroon text-phil-cream shadow'
                  : p
                  ? 'text-phil-maroonDark'
                  : 'text-phil-maroon/60'
              }`}
            >
              <span
                className={`w-6 text-[9px] font-black font-mono text-center ${
                  isPitcher ? 'text-phil-cream' : 'text-phil-maroon'
                }`}
              >
                {pos}
              </span>
              <span className="text-[11px] font-bold truncate flex-1">
                {p?.displayName ?? '—'}
              </span>
            </li>
          );
        })}
      </ul>
      {bench.length > 0 && (
        <div className="mt-1 pt-1 border-t border-phil-maroon/30">
          <div className="text-[9px] font-black uppercase tracking-widest text-phil-maroon/80 text-center">
            BENCH · {bench.length}
          </div>
          <ul className="text-[10px] text-phil-maroonDark space-y-0.5 mt-0.5">
            {bench.slice(0, 4).map((p) => (
              <li key={p.id} className="px-1.5 truncate font-semibold">{p.displayName}</li>
            ))}
            {bench.length > 4 && (
              <li className="px-1.5 text-phil-maroon/70">+{bench.length - 4} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
