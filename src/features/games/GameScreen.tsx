import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/app/AppContext';
import { opponentIsBatting, useGame } from '@/features/scoring/useGame';
import Modal from '@/components/Modal';
import Chip from '@/components/Chip';
import Diamond from '@/components/Diamond';
import Legend from '@/components/Legend';
import { pitchLimitStatus } from '@/features/rules/pitchingRules';
import { recommendDefensiveLineup } from '@/features/lineups/lineupRecommendationEngine';
import { DEFENSIVE_POSITIONS, type Position, type AtBatResult } from '@/types';
import { defenseRepo, gamesRepo, playersRepo } from '@/db/repositories';

export default function GameScreen() {
  const { gameId } = useParams();
  const nav = useNavigate();
  const { settings } = useApp();
  const g = useGame(gameId, settings);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [defenseOpen, setDefenseOpen] = useState(false);
  const [absentOpen, setAbsentOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pitchPickerOpen, setPitchPickerOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

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
    liveAlerts,
    loading
  } = g;

  useEffect(() => {
    if (!loading && !game) nav('/games', { replace: true });
  }, [loading, game, nav]);

  const batterId = lineup?.battingOrder[game?.currentBatterSlot ?? 0];
  const batter = batterId ? playersById.get(batterId) : undefined;
  const onDeckId = lineup && game
    ? lineup.battingOrder[(game.currentBatterSlot + 1) % Math.max(1, lineup.battingOrder.length)]
    : undefined;
  const onDeck = onDeckId ? playersById.get(onDeckId) : undefined;

  const currentPitcher = game?.currentPitcherPlayerId ? playersById.get(game.currentPitcherPlayerId) : undefined;
  const pitcherPitches = useMemo(() => {
    if (!game?.currentPitcherPlayerId) return 0;
    return pitchEvents.filter((p) => p.pitcherPlayerId === game.currentPitcherPlayerId).length;
  }, [pitchEvents, game?.currentPitcherPlayerId]);
  const pitcherStatus =
    settings && currentPitcher ? pitchLimitStatus(pitcherPitches, currentPitcher.age, settings) : null;

  const criticalAlerts = liveAlerts.filter((a) => a.severity === 'critical');
  const warnings = liveAlerts.filter((a) => a.severity === 'warning');

  if (loading || !game || !settings) return <div className="p-4 text-ump-dim">Loading…</div>;

  const oppBatting = opponentIsBatting(game);
  const ourBatting = !oppBatting;
  const coachPitch = settings.seasonPhase === 'early' && ourBatting;

  const firstName = game.firstBasePlayerId ? playersById.get(game.firstBasePlayerId)?.displayName : null;
  const secondName = game.secondBasePlayerId ? playersById.get(game.secondBasePlayerId)?.displayName : null;
  const thirdName = game.thirdBasePlayerId ? playersById.get(game.thirdBasePlayerId)?.displayName : null;

  const usAreHome = game.homeAway === 'home';
  const usScore = usAreHome ? game.homeScore : game.awayScore;
  const oppScore = usAreHome ? game.awayScore : game.homeScore;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 bg-ump-bg border-b border-ump-line safe-top">
        <div className="px-3 pt-2 pb-2 grid grid-cols-5 gap-1 items-center">
          <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => nav('/home')} aria-label="Exit">
            ✕
          </button>
          <div className="col-span-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-ump-dim">
              {settings.seasonPhase.toUpperCase()} SEASON · vs {game.opponent}
            </div>
            <div className="font-display text-3xl leading-none tracking-wider">
              {game.halfInning === 'top' ? '▲' : '▼'} INN {game.inning}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => setLegendOpen(true)} aria-label="Legend">
              ?
            </button>
            <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => setMenuOpen(true)} aria-label="Menu">
              ⋯
            </button>
          </div>
        </div>

        {/* Scoreboard strip */}
        <div className="px-3 pb-2">
          <div className="rounded-xl bg-ump-card border border-ump-line overflow-hidden">
            <div className="grid grid-cols-2 text-center">
              <div className={`py-2 ${oppBatting ? 'bg-ump-accent/15' : ''}`}>
                <div className="text-[10px] uppercase text-ump-dim">{game.opponent}</div>
                <div className="font-mono text-3xl font-bold">{oppScore}</div>
              </div>
              <div className={`py-2 ${ourBatting ? 'bg-ump-ok/15' : ''}`}>
                <div className="text-[10px] uppercase text-ump-ok">Us (Phillies)</div>
                <div className="font-mono text-3xl font-bold">{usScore}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Coach pitch + batter up banners */}
        {ourBatting && batter && (
          <div className="px-3 pb-2">
            <div className="rounded-xl border-2 border-ump-ok/60 bg-ump-ok/10 p-3 flex items-center gap-3 animate-pulse-slow">
              <div className="text-2xl">🏏</div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase text-ump-ok font-bold tracking-wider">
                  Batter up — #{game.currentBatterSlot + 1}
                  {coachPitch && <span className="ml-2 chip-warn">COACH PITCH</span>}
                </div>
                <div className="text-lg font-bold truncate">{batter.displayName}</div>
                {onDeck && <div className="text-[11px] text-ump-dim">On deck: {onDeck.displayName}</div>}
              </div>
              <Chip tone="info">#{batter.jerseyNumber || '—'}</Chip>
            </div>
          </div>
        )}

        {oppBatting && (
          <div className="px-3 pb-2">
            <div className="rounded-xl border border-ump-line bg-ump-card p-2 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase text-ump-dim">Opp at bat</div>
                <div className="font-bold">#{game.opponentBatterNumber ?? '?'} in their order</div>
              </div>
              <button
                className="tap-btn tap-btn-neutral tap-btn-sm"
                onClick={async () => {
                  await gamesRepo.update(game.id, {
                    opponentBatterNumber: ((game.opponentBatterNumber ?? 1) % 9) + 1
                  });
                  refresh();
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {(criticalAlerts.length > 0 || warnings.length > 0) && (
          <div
            className={`px-3 py-2 border-t ${
              criticalAlerts.length > 0 ? 'bg-ump-crit/15 border-ump-crit/40' : 'bg-ump-warn/10 border-ump-warn/40'
            }`}
          >
            {criticalAlerts.slice(0, 1).map((a) => (
              <div key={a.id} className="text-sm font-semibold text-ump-crit">⚠ {a.message}</div>
            ))}
            {criticalAlerts.length === 0 &&
              warnings.slice(0, 1).map((a) => (
                <div key={a.id} className="text-sm font-semibold text-ump-warn">! {a.message}</div>
              ))}
            {liveAlerts.length > 1 && <div className="text-xs text-ump-dim">+{liveAlerts.length - 1} more</div>}
          </div>
        )}
      </header>

      <main className="flex-1 p-3 space-y-3 pb-40">
        <Diamond
          batterName={ourBatting ? batter?.displayName : `Opp #${game.opponentBatterNumber ?? '?'}`}
          firstName={firstName}
          secondName={secondName}
          thirdName={thirdName}
          outs={game.outs}
          balls={game.balls}
          strikes={game.strikes}
        />

        {game.lastPlay && (
          <div className="card py-2 text-sm text-center text-ump-ink bg-ump-card/60">
            <span className="text-ump-dim text-xs mr-1">Last play:</span> {game.lastPlay}
          </div>
        )}

        {/* Pitcher card - only meaningful when opponent bats */}
        {oppBatting && (
          <div className="card">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="field-label">Our pitcher</div>
                <div className="font-bold truncate">{currentPitcher?.displayName ?? 'Assign…'}</div>
                {pitcherStatus && currentPitcher && (
                  <div className="mt-1 flex items-center gap-2 flex-wrap text-xs">
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
                      {currentPitcher.age != null ? `age ${currentPitcher.age}` : 'age not set'} · rest if out: {pitcherStatus.restDaysIfStopNow}d
                    </span>
                    <div className="w-full mt-1 h-2 rounded-full bg-ump-line overflow-hidden">
                      <div
                        className={`h-full ${
                          pitcherStatus.tier === 'over' || pitcherStatus.tier === 'red'
                            ? 'bg-ump-crit'
                            : pitcherStatus.tier === 'yellow'
                            ? 'bg-ump-warn'
                            : 'bg-ump-ok'
                        }`}
                        style={{
                          width: `${Math.min(100, (pitcherStatus.pitchesThrown / Math.max(1, pitcherStatus.dailyMax)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => setPitchPickerOpen(true)}>
                Change
              </button>
            </div>
          </div>
        )}

        {/* Secondary row: defense / availability / undo */}
        <div className="grid grid-cols-3 gap-2">
          <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => setDefenseOpen(true)}>
            🧤 Defense
          </button>
          <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => setAbsentOpen(true)}>
            👥 Absent
          </button>
          <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={undoLast}>
            ↶ Undo
          </button>
        </div>
      </main>

      {/* Bottom sticky action bar */}
      <div className="fixed bottom-0 inset-x-0 z-20 bg-ump-bg border-t border-ump-line safe-bottom px-3 pt-3 pb-3">
        <div className="grid grid-cols-3 gap-2 mb-2">
          <button className="tap-btn tap-btn-neutral tap-btn-xl" onClick={() => addPitch('ball')}>
            BALL
          </button>
          <button className="tap-btn tap-btn-primary tap-btn-xl" onClick={() => addPitch('strike')}>
            STRIKE
          </button>
          <button className="tap-btn tap-btn-neutral tap-btn-xl" onClick={() => addPitch('foul')}>
            FOUL
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button className="tap-btn tap-btn-danger tap-btn-lg" onClick={() => resolveAtBat('groundout', 0, 1)}>
            OUT
          </button>
          <button className="tap-btn tap-btn-success tap-btn-lg" onClick={() => setResolveOpen(true)}>
            IN PLAY
          </button>
        </div>
      </div>

      <ResolveAtBatModal
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        onResolve={async (r, rbis, outs) => {
          await resolveAtBat(r, rbis, outs);
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

      <Legend open={legendOpen} onClose={() => setLegendOpen(false)} />

      <Modal
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Game menu"
        footer={
          <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => setMenuOpen(false)}>
            Close
          </button>
        }
      >
        <button
          className="tap-btn tap-btn-neutral tap-btn-lg w-full"
          onClick={() => {
            setMenuOpen(false);
            setLegendOpen(true);
          }}
        >
          Show legend
        </button>
        <button
          className="tap-btn tap-btn-danger tap-btn-lg w-full"
          onClick={async () => {
            if (!confirm('Finalize this game? This locks pitch counts and saves rest days.')) return;
            await finalizeGame();
            setMenuOpen(false);
            nav('/games');
          }}
        >
          Finalize game
        </button>
      </Modal>
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
  onResolve: (r: AtBatResult, rbis: number, outs: number) => void;
}) {
  const [rbis, setRbis] = useState(0);
  const buttons: Array<{ r: AtBatResult; label: string; tone: 'primary' | 'success' | 'danger' | 'neutral'; outs: number }> = [
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
      <div className="flex items-center gap-2 mb-2 text-sm">
        <span className="field-label">RBIs</span>
        <Stepper value={rbis} onChange={setRbis} />
        <span className="text-xs text-ump-dim ml-2">Runs are auto-computed from base state.</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {buttons.map((b) => (
          <button
            key={b.r}
            className={`tap-btn tap-btn-${b.tone} tap-btn-lg`}
            onClick={() => onResolve(b.r, rbis, b.outs)}
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
      <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => onChange(Math.max(0, value - 1))}>
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
  players: Array<{ id: string; displayName: string; age?: number }>;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Pick pitcher">
      <ul className="space-y-1 max-h-[60vh] overflow-auto">
        {players.map((p) => (
          <li key={p.id}>
            <button className="tap-btn tap-btn-neutral tap-btn-lg w-full justify-between" onClick={() => onPick(p.id)}>
              <span>{p.displayName}</span>
              {p.age != null ? (
                <span className="text-xs text-ump-dim">age {p.age}</span>
              ) : (
                <span className="text-xs text-ump-warn">set age</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-ump-dim mt-2">
        Missing an age? Go to Roster → tap player → set age. The daily pitch cap follows the age.
      </p>
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
      setAllPlayers(active.map((p) => ({ id: p.id, displayName: p.displayName })));
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

  const updatePos = (pos: Position, pid: string) => {
    setRec((prev) => {
      const without = prev.filter((r) => r.position !== pos && r.playerId !== pid);
      if (!pid) return without;
      return [...without, { playerId: pid, position: pos, reason: 'Manual pick' }];
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Defense rotation"
      footer={
        <>
          <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="tap-btn tap-btn-primary tap-btn-sm"
            onClick={() => onSave(rec.map(({ playerId, position }) => ({ playerId, position })))}
          >
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
                onClick={() =>
                  setAbsent((prev) => {
                    const next = new Set(prev);
                    if (next.has(p.id)) next.delete(p.id);
                    else next.add(p.id);
                    return next;
                  })
                }
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
