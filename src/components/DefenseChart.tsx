import { useMemo } from 'react';
import type { DefensiveAssignment, Player, Position, SeasonSettings, Game } from '@/types';
import { DEFENSIVE_POSITIONS } from '@/types';
import { auditPlayingTime } from '@/features/rules/playingTimeRules';

interface Props {
  game: Game;
  settings: SeasonSettings;
  players: Player[];
  defense: DefensiveAssignment[]; // all assignments for the game
  compact?: boolean;
}

export default function DefenseChart({ game, settings, players, defense, compact = false }: Props) {
  const currentInningAssigns = defense.filter((d) => d.inning === game.inning);
  const activePlayers = players.filter((p) => p.active && !game.absentPlayerIds.includes(p.id));

  const posToPlayer = useMemo(() => {
    const m = new Map<Position, Player | undefined>();
    for (const d of currentInningAssigns) {
      m.set(d.position, players.find((p) => p.id === d.playerId));
    }
    return m;
  }, [currentInningAssigns, players]);

  const assignedIds = new Set(currentInningAssigns.map((a) => a.playerId));
  const bench = activePlayers.filter((p) => !assignedIds.has(p.id));

  const audits = auditPlayingTime(activePlayers, defense, game, settings);
  const auditByPlayer = new Map(audits.map((a) => [a.playerId, a]));

  return (
    <div className="space-y-2">
      <div>
        <div className="field-label mb-1">On the field — inning {game.inning}</div>
        <div className="grid grid-cols-3 gap-1 text-xs">
          {DEFENSIVE_POSITIONS.map((pos) => {
            const p = posToPlayer.get(pos);
            const audit = p ? auditByPlayer.get(p.id) : null;
            return (
              <div
                key={pos}
                className={`rounded-xl border p-2 ${
                  p
                    ? 'bg-phil-blueLight border-phil-maroon/50 text-phil-maroonDark'
                    : 'border-dashed border-phil-blueDeep text-phil-maroon/50 bg-white'
                }`}
              >
                <div className="text-[9px] font-black opacity-70 tracking-wider">{pos}</div>
                <div className="font-semibold truncate">{p?.displayName ?? '—'}</div>
                {p && audit && (
                  <div className="text-[10px] text-phil-maroon mt-0.5">
                    {audit.defensiveInnings} def · {audit.firstHalfInnings} early
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!compact && (
        <div>
          <div className="field-label mb-1">Bench · {bench.length}</div>
          {bench.length === 0 ? (
            <div className="text-xs text-phil-maroon">All available players are on the field.</div>
          ) : (
            <ul className="grid grid-cols-2 gap-1 text-xs">
              {bench.map((p) => {
                const a = auditByPlayer.get(p.id);
                const needs = a?.inningsStillNeeded ?? 0;
                const tone =
                  needs > 0 && needs >= settings.maxInnings - game.inning + 1
                    ? 'border-ump-crit/60 bg-ump-crit/10 text-ump-crit'
                    : needs > 0
                    ? 'border-ump-warn/50 bg-ump-warn/10 text-ump-warn'
                    : 'border-phil-blueDeep bg-white text-phil-maroon';
                return (
                  <li
                    key={p.id}
                    className={`rounded-xl border px-2 py-1.5 flex items-center justify-between ${tone}`}
                  >
                    <span className="truncate font-semibold">{p.displayName}</span>
                    <span className="text-[10px] ml-1">
                      {a?.defensiveInnings ?? 0}d · need {needs}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
