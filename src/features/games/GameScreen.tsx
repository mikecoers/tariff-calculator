import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/app/AppContext';
import { useGame } from '@/features/scoring/useGame';
import Modal from '@/components/Modal';
import PrimaryButton from '@/components/PrimaryButton';
import Chip from '@/components/Chip';
import { pitchLimitStatus } from '@/features/rules/pitchingRules';
import { recommendDefensiveLineup } from '@/features/lineups/lineupRecommendationEngine';
import { DEFENSIVE_POSITIONS, type Position } from '@/types';
import { defenseRepo, gamesRepo, lineupsRepo, playersRepo } from '@/db/repositories';
import { auditPlayingTime } from '@/features/rules/playingTimeRules';
import { computeLiveAlerts } from '@/features/rules/complianceEngine';
import { describePhase } from '@/features/rules/seasonPhaseRules';

export default function GameScreen() {
  const { gameId } = useParams();
  const nav = useNavigate();
  const { settings } = useApp();
  const bundle = useGame(gameId, settings);
  const [pitchPickerOpen, setPitchPickerOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [defenseOpen, setDefenseOpen] = useState(false);
  const [absentOpen, setAbsentOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const {
    game,
    players,
    lineup,
    defense,
    pitchEvents,
    playersById,
    addPitch,
    resolveAtBat,
    setPitcher,
    undoLast,
    applyDefensiveInning,
    finalizeGame,
    refresh,
    loading
  } = bundle;

  useEffect(() => {
    if (!loading && !game) nav('/games', { replace: true });
  }, [loading, game, nav]);

  const currentBatter = useMemo(() => {
    if (!lineup) return undefined;
    const id = lineup.battingOrder[game?.currentBatterSlot ?? 0];
    return id ? playersById.get(id) : undefined;
  }, [lineup, game?.currentBatterSlot, playersById]);

  const currentPitcher = game?.currentPitcherPlayerId ? playersById.get(game.currentPitcherPlayerId) : undefined;
  const pitcherPitches = useMemo(() => {
    if (!game?.currentPitcherPlayerId) return 0;
    return pitchEvents.filter((p) => p.pitcherPlayerId === game.currentPitcherPlayerId).length;
  }, [pitchEvents, game?.currentPitcherPlayerId]);

  const pitcherStatus =
    settings && currentPitcher ? pitchLimitStatus(pitcherPitches, currentPitcher.age, settings) : null;

  const alerts = useMemo(() => {
    if (!settings || !game) return [];
    return computeLiveAlerts({ game, settings, players, assignments: defense, pitchEvents });
  }, [game, settings, players, defense, pitchEvents]);

  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const warnings = alerts.filter((a) => a.severity === 'warning');

  if (loading || !game || !settings) return <div className="p-4 text-ump-dim">Loading…</div>;

  const isOurBatting = (game.halfInning === 'bottom' && game.homeAway === 'home') || (game.halfInning === 'top' && game.homeAway === 'away');
  const scoreLine = `${game.homeAway === 'away' ? 'Us' : game.opponent} ${game.awayScore} — ${game.homeAway === 'home' ? 'Us' : game.opponent} ${game.homeScore}`;
  const phase = describePhase(game.seasonPhase);
  const absent = players.filter((p) => (game.absentPlayerIds || []).includes(p.id));

  const opponentBatting = !isOurBatting;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-ump-bg border-b border-ump-line safe-top">
        <div className="px-3 py-2 flex items-center justify-between gap-2">
          <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => nav('/home')}>
            ✕
          </button>
          <div className="text-center flex-1">
            <div className="text-[10px] uppercase tracking-wider text-ump-dim">{phase.label}</div>
            <div className="text-lg font-bold leading-tight">vs {game.opponent}</div>
          </div>
          <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => setEndOpen(true)}>
            ⋯
          </button>
        </div>

        <div className="px-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="font-display text-5xl leading-none tracking-wider">
              {game.halfInning === 'top' ? '▲' : '▼'}{game.inning}
            </div>
            <div className="font-mono font-bold text-3xl">
              {game.awayScore}-{game.homeScore}
            </div>
            <div className="flex flex-col items-end text-sm">
              <span className="chip">OUTS {game.outs}</span>
              <span className="chip mt-1">{game.balls}-{game.strikes}</span>
            </div>
          </div>
          <div className="text-[11px] text-ump-dim mt-1 truncate">{scoreLine}</div>
        </div>

        {(criticalAlerts.length > 0 || warnings.length > 0) && (
          <div className="px-3 py-2 bg-ump-crit/10 border-t border-ump-crit/40">
            {criticalAlerts.slice(0, 1).map((a) => (
              <div key={a.id} className="text-sm font-semibold text-ump-crit">⚠ {a.message}</div>
            ))}
            {criticalAlerts.length === 0 && warnings.slice(0, 1).map((a) => (
              <div key={a.id} className="text-sm font-semibold text-ump-warn">! {a.message}</div>
            ))}
            {alerts.length > 1 && (
              <div className="text-xs text-ump-dim">+{alerts.length - 1} more</div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 p-3 space-y-3 pb-36">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="field-label">{opponentBatting ? 'Opponent at bat' : 'Our batter'}</div>
              <div className="font-bold text-xl mt-0.5">
                {opponentBatting
                  ? `Opp #${game.opponentBatterNumber ?? '?'}`
                  : currentBatter?.displayName ?? '—'}
              </div>
            </div>
            {!opponentBatting && currentBatter && (
              <span className="chip-info">#{game.currentBatterSlot + 1} in order</span>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="field-label">Pitcher ({opponentBatting ? 'Ours' : 'Opponent'})</div>
              <div className="font-bold text-xl mt-0.5">
                {opponentBatting ? currentPitcher?.displayName ?? 'Assign…' : 'Opponent pitcher'}
              </div>
              {opponentBatting && pitcherStatus && currentPitcher && (
                <div className="text-xs mt-1 flex items-center gap-2">
                  <Chip
                    tone={
                      pitcherStatus.tier === 'over' || pitcherStatus.tier === 'red'
                        ? 'crit'
                        : pitcherStatus.tier === 'yellow'
                        ? 'warn'
                        : 'ok'
                    }
                  >
                    {pitcherStatus.pitchesThrown}/{pitcherStatus.dailyMax} pitches
                  </Chip>
                  <span className="text-ump-dim">
                    rest: {pitcherStatus.restDaysIfStopNow}d
                  </span>
                </div>
              )}
            </div>
            {opponentBatting && (
              <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => setPitchPickerOpen(true)}>
                Change
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button className="tap-btn tap-btn-neutral tap-btn-lg" onClick={() => addPitch('ball')}>
            <div className="text-xs">Ball</div>
            <div className="text-3xl">B</div>
          </button>
          <button className="tap-btn tap-btn-primary tap-btn-lg" onClick={() => addPitch('strike')}>
            <div className="text-xs">Strike</div>
            <div className="text-3xl">K</div>
          </button>
          <button className="tap-btn tap-btn-neutral tap-btn-lg" onClick={() => addPitch('foul')}>
            <div className="text-xs">Foul</div>
            <div className="text-3xl">F</div>
          </button>
        </div>

        <PrimaryButton size="xl" className="w-full" onClick={() => setResolveOpen(true)}>
          Resolve at-bat
        </PrimaryButton>

        <div className="grid grid-cols-2 gap-2">
          <button className="tap-btn tap-btn-danger tap-btn-lg" onClick={async () => {
            await resolveAtBat('groundout', 0, 0, 1);
          }}>
            + Out
          </button>
          <button
            className="tap-btn tap-btn-success tap-btn-lg"
            onClick={async () => {
              const next = { ...game };
              const isHomeBatting = (next.halfInning === 'bottom' && next.homeAway === 'home') || (next.halfInning === 'top' && next.homeAway !== 'home');
              await gamesRepo.update(game.id, {
                homeScore: game.homeScore + (isHomeBatting ? 1 : 0),
                awayScore: game.awayScore + (!isHomeBatting ? 1 : 0),
                runsThisInning: game.runsThisInning + 1
              });
              refresh();
            }}
          >
            + Run
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button className="tap-btn tap-btn-neutral tap-btn-lg" onClick={() => setDefenseOpen(true)}>
            🧤 Defense
          </button>
          <button className="tap-btn tap-btn-neutral tap-btn-lg" onClick={() => setAbsentOpen(true)}>
            👥 {absent.length ? `${absent.length} absent` : 'Availability'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={undoLast}>
            ↶ Undo last
          </button>
          <button
            className="tap-btn tap-btn-neutral tap-btn-sm"
            onClick={async () => {
              await gamesRepo.update(game.id, {
                opponentBatterNumber: ((game.opponentBatterNumber ?? 1) % 9) + 1
              });
              refresh();
            }}
          >
            Opp next batter →
          </button>
        </div>

        <CurrentDefensePanel game={game} defense={defense} players={players} />
      </main>

      <ResolveAtBatModal
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        onResolve={async (r, runs, rbis, outs) => {
          await resolveAtBat(r, runs, rbis, outs);
          setResolveOpen(false);
        }}
      />

      <PitcherPickerModal
        open={pitchPickerOpen}
        onClose={() => setPitchPickerOpen(false)}
        onPick={async (pid) => {
          await setPitcher(pid);
          setPitchPickerOpen(false);
        }}
        gameId={game.id}
        players={players.filter((p) => !game.absentPlayerIds.includes(p.id))}
      />

      <DefenseModal
        open={defenseOpen}
        onClose={() => setDefenseOpen(false)}
        onSave={async (assigns) => {
          await applyDefensiveInning(game.inning, assigns);
          setDefenseOpen(false);
        }}
      />

      <AbsentModal
        open={absentOpen}
        onClose={() => setAbsentOpen(false)}
        game={game}
        players={players}
        onSave={async (absentIds) => {
          await gamesRepo.update(game.id, { absentPlayerIds: absentIds });
          setAbsentOpen(false);
          refresh();
        }}
      />

      <Modal
        open={endOpen}
        onClose={() => setEndOpen(false)}
        title="Game menu"
        footer={
          <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => setEndOpen(false)}>
            Close
          </button>
        }
      >
        <button
          className="tap-btn tap-btn-danger tap-btn-lg w-full"
          onClick={async () => {
            if (!confirm('Finalize this game?')) return;
            await finalizeGame();
            setEndOpen(false);
            nav('/games');
          }}
        >
          Finalize game
        </button>
      </Modal>
    </div>
  );
}

function CurrentDefensePanel({
  game,
  defense,
  players
}: {
  game: { id: string; inning: number };
  defense: Array<{ playerId: string; position: Position; inning: number }>;
  players: Array<{ id: string; displayName: string }>;
}) {
  const inningAssigns = defense.filter((d) => d.inning === game.inning);
  const byPos = new Map(inningAssigns.map((d) => [d.position, d.playerId]));
  const byId = new Map(players.map((p) => [p.id, p]));
  return (
    <div className="card">
      <div className="field-label mb-1">Defense — inning {game.inning}</div>
      <div className="grid grid-cols-3 gap-1 text-sm">
        {(['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as Position[]).map((pos) => {
          const pid = byPos.get(pos);
          const p = pid ? byId.get(pid) : undefined;
          return (
            <div
              key={pos}
              className={`rounded-xl border px-2 py-2 ${
                p ? 'border-ump-ok/50 bg-ump-ok/5' : 'border-dashed border-ump-line text-ump-dim'
              }`}
            >
              <div className="text-[10px] font-bold opacity-70">{pos}</div>
              <div className="font-medium truncate">{p?.displayName ?? '—'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResolveAtBatModal({
  open,
  onClose,
  onResolve
}: {
  open: boolean;
  onClose: () => void;
  onResolve: (r: 'single' | 'double' | 'triple' | 'hr' | 'walk' | 'strikeout' | 'groundout' | 'flyout' | 'hbp' | 'fc' | 'error' | 'sac', runs: number, rbis: number, outs: number) => void;
}) {
  const [runs, setRuns] = useState(0);
  const [rbis, setRbis] = useState(0);
  const buttons: Array<{ r: Parameters<typeof onResolve>[0]; label: string; tone: 'primary' | 'success' | 'danger' | 'neutral'; outs: number }> = [
    { r: 'single', label: '1B', tone: 'primary', outs: 0 },
    { r: 'double', label: '2B', tone: 'primary', outs: 0 },
    { r: 'triple', label: '3B', tone: 'primary', outs: 0 },
    { r: 'hr', label: 'HR', tone: 'success', outs: 0 },
    { r: 'walk', label: 'BB', tone: 'neutral', outs: 0 },
    { r: 'hbp', label: 'HBP', tone: 'neutral', outs: 0 },
    { r: 'strikeout', label: 'K', tone: 'danger', outs: 1 },
    { r: 'groundout', label: 'GO', tone: 'danger', outs: 1 },
    { r: 'flyout', label: 'FO', tone: 'danger', outs: 1 },
    { r: 'fc', label: 'FC', tone: 'danger', outs: 1 },
    { r: 'error', label: 'E', tone: 'neutral', outs: 0 },
    { r: 'sac', label: 'SAC', tone: 'danger', outs: 1 }
  ];
  return (
    <Modal open={open} onClose={onClose} title="Result of at-bat">
      <div className="flex items-center justify-between mb-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="field-label">Runs</span>
          <Stepper value={runs} onChange={setRuns} />
        </div>
        <div className="flex items-center gap-2">
          <span className="field-label">RBIs</span>
          <Stepper value={rbis} onChange={setRbis} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {buttons.map((b) => (
          <button
            key={b.r}
            className={`tap-btn tap-btn-${b.tone} tap-btn-lg`}
            onClick={() => onResolve(b.r, runs, rbis, b.outs)}
          >
            {b.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="inline-flex items-center gap-2">
      <button
        className="tap-btn tap-btn-neutral tap-btn-sm"
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        −
      </button>
      <span className="w-6 text-center font-bold">{value}</span>
      <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

function PitcherPickerModal({
  open,
  onClose,
  onPick,
  players
}: {
  open: boolean;
  onClose: () => void;
  onPick: (playerId: string) => void;
  gameId: string;
  players: Array<{ id: string; displayName: string; age?: number }>;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Pick pitcher">
      <ul className="space-y-1 max-h-[60vh] overflow-auto">
        {players.map((p) => (
          <li key={p.id}>
            <button className="tap-btn tap-btn-neutral tap-btn-lg w-full justify-between" onClick={() => onPick(p.id)}>
              <span>{p.displayName}</span>
              {p.age != null && <span className="text-xs text-ump-dim">age {p.age}</span>}
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function DefenseModal({
  open,
  onClose,
  onSave
}: {
  open: boolean;
  onClose: () => void;
  onSave: (assigns: Array<{ playerId: string; position: Position }>) => void;
}) {
  const { gameId } = useParams();
  const { settings } = useApp();
  const [rec, setRec] = useState<Array<{ playerId: string; position: Position; reason?: string }>>([]);
  const [allPlayers, setAllPlayers] = useState<Array<{ id: string; displayName: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !gameId || !settings) return;
    setLoading(true);
    void (async () => {
      const game = await gamesRepo.get(gameId);
      if (!game) return;
      const ps = await playersRepo.byTeam(game.teamId);
      const active = ps.filter((p) => p.active && !game.absentPlayerIds.includes(p.id));
      setAllPlayers(ps.map((p) => ({ id: p.id, displayName: p.displayName })));
      const priorAssigns = await defenseRepo.forGame(game.id);
      const result = recommendDefensiveLineup({
        players: active,
        game,
        nextInning: game.inning,
        settings,
        priorAssignments: priorAssigns
      });
      setRec(result.assignments);
      setLoading(false);
    })();
  }, [open, gameId, settings]);

  const byId = new Map(allPlayers.map((p) => [p.id, p]));

  const updatePos = (pos: Position, pid: string) => {
    setRec((prev) => {
      const without = prev.filter((r) => r.position !== pos && r.playerId !== pid);
      return [...without, { playerId: pid, position: pos, reason: 'Manual pick' }];
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Suggested defense"
      footer={
        <>
          <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button className="tap-btn tap-btn-primary tap-btn-sm" onClick={() => onSave(rec.map(({ playerId, position }) => ({ playerId, position })))}>
            Apply
          </button>
        </>
      }
    >
      {loading ? (
        <div>Thinking…</div>
      ) : (
        <div className="space-y-2">
          {DEFENSIVE_POSITIONS.map((pos) => {
            const current = rec.find((r) => r.position === pos);
            const p = current ? byId.get(current.playerId) : undefined;
            return (
              <div key={pos} className="flex items-center gap-2">
                <div className="w-10 font-mono text-sm text-ump-dim">{pos}</div>
                <select
                  className="input"
                  value={current?.playerId ?? ''}
                  onChange={(e) => updatePos(pos, e.target.value)}
                >
                  <option value="">— none —</option>
                  {allPlayers.map((ap) => (
                    <option key={ap.id} value={ap.id}>
                      {ap.displayName}
                    </option>
                  ))}
                </select>
                {current?.reason && <div className="text-[10px] text-ump-dim max-w-[40%]">{current.reason}</div>}
                {!current && <span className="text-xs text-ump-warn">unfilled</span>}
                {p && <span className="sr-only">{p.displayName}</span>}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

function AbsentModal({
  open,
  onClose,
  onSave,
  game,
  players
}: {
  open: boolean;
  onClose: () => void;
  onSave: (absentIds: string[]) => void;
  game: { absentPlayerIds: string[] };
  players: Array<{ id: string; displayName: string; jerseyNumber?: string; firstName: string; lastName: string }>;
}) {
  const [absent, setAbsent] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (open) setAbsent(new Set(game.absentPlayerIds));
  }, [open, game.absentPlayerIds]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Availability"
      footer={
        <>
          <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={onClose}>Cancel</button>
          <button className="tap-btn tap-btn-primary tap-btn-sm" onClick={() => onSave(Array.from(absent))}>Save</button>
        </>
      }
    >
      <p className="text-xs text-ump-dim">Tap a player to toggle absent. Absent players won't appear in lineup or rotation.</p>
      <ul className="grid grid-cols-2 gap-2 mt-2">
        {players.map((p) => {
          const isAbsent = absent.has(p.id);
          return (
            <li key={p.id}>
              <button
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  isAbsent ? 'border-ump-crit/60 bg-ump-crit/10 text-ump-crit line-through' : 'border-ump-line bg-ump-card text-ump-ink'
                }`}
                onClick={() => setAbsent((prev) => {
                  const next = new Set(prev);
                  if (next.has(p.id)) next.delete(p.id);
                  else next.add(p.id);
                  return next;
                })}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ump-bg border border-ump-line text-sm font-bold">
                    {p.jerseyNumber || `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase()}
                  </span>
                  <span className="text-sm font-medium truncate">{p.displayName}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

// unused import guards
void auditPlayingTime;
void lineupsRepo;
