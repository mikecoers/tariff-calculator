import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/app/AppContext';
import { opponentIsBatting, useGame } from '@/features/scoring/useGame';
import Modal from '@/components/Modal';
import Diamond from '@/components/Diamond';
import Legend from '@/components/Legend';
import PitcherPicker from '@/components/PitcherPicker';
import BaseActionMenu, { type BaseKey, type BaseAction } from '@/components/BaseActionMenu';
import PlayingTimeBanner from '@/components/PlayingTimeBanner';
import UndoHistory from '@/components/UndoHistory';
import { pitchLimitStatus } from '@/features/rules/pitchingRules';
import { recommendDefensiveLineup } from '@/features/lineups/lineupRecommendationEngine';
import { DEFENSIVE_POSITIONS, type Position, type AtBatResult } from '@/types';
import { defenseRepo, gamesRepo, playersRepo } from '@/db/repositories';
import { haptic, loadHapticsPref } from '@/lib/haptics';

export default function GameScreen() {
  const { gameId } = useParams();
  const nav = useNavigate();
  const { settings } = useApp();
  const g = useGame(gameId, settings);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [defenseOpen, setDefenseOpen] = useState(false);
  const [absentOpen, setAbsentOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pitcherOpen, setPitcherOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [undoOpen, setUndoOpen] = useState(false);
  const [baseMenu, setBaseMenu] = useState<BaseKey | null>(null);
  const promptedForHalf = useRef<string>('');

  useEffect(() => {
    loadHapticsPref();
  }, []);

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
    advanceRunner,
    runnerScored,
    runnerOut,
    undoLast,
    undoTo,
    applyDefensiveInning,
    finalizeGame,
    refresh,
    liveAlerts,
    loading
  } = g;

  useEffect(() => {
    if (!loading && !game) nav('/games', { replace: true });
  }, [loading, game, nav]);

  useEffect(() => {
    if (!game) return;
    const key = `${game.inning}-${game.halfInning}`;
    if (!opponentIsBatting(game)) return;
    if (promptedForHalf.current === key) return;
    if (!game.currentPitcherPlayerId) {
      setPitcherOpen(true);
      promptedForHalf.current = key;
    } else {
      promptedForHalf.current = key;
    }
  }, [game?.inning, game?.halfInning, game?.currentPitcherPlayerId, game]);

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

  if (loading || !game || !settings) return <div className="p-4 text-phil-creamDim">Loading…</div>;

  const oppBatting = opponentIsBatting(game);
  const ourBatting = !oppBatting;
  const coachPitch = settings.seasonPhase === 'early' && ourBatting;

  const firstName = game.firstBasePlayerId ? playersById.get(game.firstBasePlayerId)?.displayName : null;
  const secondName = game.secondBasePlayerId ? playersById.get(game.secondBasePlayerId)?.displayName : null;
  const thirdName = game.thirdBasePlayerId ? playersById.get(game.thirdBasePlayerId)?.displayName : null;

  const usAreHome = game.homeAway === 'home';
  const usScore = usAreHome ? game.homeScore : game.awayScore;
  const oppScore = usAreHome ? game.awayScore : game.homeScore;

  const pitcherBarPct = pitcherStatus
    ? Math.min(100, (pitcherStatus.pitchesThrown / Math.max(1, pitcherStatus.dailyMax)) * 100)
    : 0;

  const runnerOnBase = (b: BaseKey) =>
    b === 'first' ? firstName : b === 'second' ? secondName : thirdName;

  const handleBaseAction = async (action: BaseAction) => {
    if (!baseMenu) return;
    const from = baseMenu;
    setBaseMenu(null);
    if (action === 'advance') {
      haptic('light');
      await advanceRunner(from);
    } else if (action === 'score') {
      haptic('success');
      await runnerScored(from);
    } else if (action === 'out') {
      haptic('warning');
      await runnerOut(from);
    }
  };

  return (
    <div className="h-dvh flex flex-col overflow-hidden safe-top">
      <header className="shrink-0 px-3 pt-2 pb-2 border-b border-ump-line bg-phil-maroonDark/60 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <button className="tap-btn tap-btn-ghost tap-btn-sm" onClick={() => nav('/home')} aria-label="Exit">
            ✕
          </button>
          <div className="flex-1 text-center">
            <div className="text-[9px] uppercase tracking-widest text-phil-creamDim">
              {settings.seasonPhase.toUpperCase()} · vs {game.opponent}
            </div>
            <div className="font-display text-2xl leading-none tracking-wider text-phil-cream">
              {game.halfInning === 'top' ? '▲' : '▼'} INN {game.inning}
            </div>
          </div>
          <div className="flex gap-1">
            <button className="tap-btn tap-btn-ghost tap-btn-sm" onClick={() => { haptic('light'); nav(`/game/${game.id}/scoreboard`); }} aria-label="Scoreboard">
              📺
            </button>
            <button className="tap-btn tap-btn-ghost tap-btn-sm" onClick={() => setLegendOpen(true)} aria-label="Legend">?</button>
            <button className="tap-btn tap-btn-ghost tap-btn-sm" onClick={() => setMenuOpen(true)} aria-label="Menu">⋯</button>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className={`score-tile ${oppBatting ? 'score-tile-active-opp' : ''}`}>
            <div className="text-[10px] uppercase font-bold text-phil-creamDim truncate">{game.opponent}</div>
            <div className="font-mono text-2xl font-black text-phil-cream">{oppScore}</div>
          </div>
          <div className={`score-tile ${ourBatting ? 'score-tile-active-us' : ''}`}>
            <div className="text-[10px] uppercase font-bold text-phil-blue truncate">Phillies</div>
            <div className="font-mono text-2xl font-black text-phil-cream">{usScore}</div>
          </div>
        </div>

        {/* Proactive playing-time call-out */}
        <div className="mt-2">
          <PlayingTimeBanner players={players} assignments={defense} game={game} settings={settings} />
        </div>

        {ourBatting && batter && (
          <div className="mt-2 rounded-xl border-2 border-phil-blue/70 bg-phil-blue/15 px-3 py-1.5 flex items-center gap-2 animate-glow">
            <span className="text-xl">🏏</span>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] uppercase font-black text-phil-blue tracking-widest flex items-center gap-2">
                Batter up · #{game.currentBatterSlot + 1}
                {coachPitch && <span className="chip-warn">COACH PITCH</span>}
              </div>
              <div className="text-base font-bold truncate text-phil-cream">
                {batter.displayName}
                {onDeck && <span className="ml-2 text-[10px] text-phil-creamDim font-medium">on deck: {onDeck.displayName}</span>}
              </div>
            </div>
          </div>
        )}
        {oppBatting && (
          <div className="mt-2 rounded-xl border border-ump-line bg-phil-maroon px-3 py-1.5 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[9px] uppercase font-black text-phil-creamDim tracking-widest">Opp at bat</div>
              <div className="text-sm font-bold truncate">#{game.opponentBatterNumber ?? '?'} in their order</div>
            </div>
            <button
              className="tap-btn tap-btn-ghost tap-btn-sm"
              onClick={async () => {
                haptic('light');
                await gamesRepo.update(game.id, {
                  opponentBatterNumber: ((game.opponentBatterNumber ?? 1) % 9) + 1
                });
                refresh();
              }}
            >
              Next →
            </button>
          </div>
        )}

        {(criticalAlerts.length > 0 || warnings.length > 0) && (
          <div
            className={`mt-2 rounded-lg px-2 py-1 text-xs font-semibold ${
              criticalAlerts.length > 0 ? 'bg-ump-crit/15 text-ump-crit' : 'bg-ump-warn/15 text-ump-warn'
            }`}
          >
            {criticalAlerts[0]?.message ?? warnings[0]?.message}
            {liveAlerts.length > 1 && <span className="ml-1 opacity-70">(+{liveAlerts.length - 1})</span>}
          </div>
        )}
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2">
        <Diamond
          batterName={ourBatting ? batter?.displayName : `Opp #${game.opponentBatterNumber ?? '?'}`}
          firstName={firstName}
          secondName={secondName}
          thirdName={thirdName}
          outs={game.outs}
          balls={game.balls}
          strikes={game.strikes}
          compact
          onBaseTap={(base) => {
            if (!ourBatting) return; // only move our runners
            if (runnerOnBase(base)) {
              haptic('light');
              setBaseMenu(base);
            }
          }}
        />

        {game.lastPlay && (
          <div className="text-center text-xs text-phil-creamDim truncate">
            <span className="opacity-60">Last:</span> {game.lastPlay}
          </div>
        )}

        {oppBatting && (
          <button
            onClick={() => { haptic('light'); setPitcherOpen(true); }}
            className="card w-full text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="field-label flex items-center gap-2">
                  Our pitcher · inning {game.inning}
                  <span className="chip-info">tap to change</span>
                </div>
                <div className="font-bold truncate text-base">
                  {currentPitcher?.displayName ?? 'TAP TO SELECT'}
                </div>
                {pitcherStatus && currentPitcher ? (
                  <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px]">
                    <span
                      className={
                        pitcherStatus.tier === 'over' || pitcherStatus.tier === 'red'
                          ? 'chip-crit'
                          : pitcherStatus.tier === 'yellow'
                          ? 'chip-warn'
                          : 'chip-ok'
                      }
                    >
                      {pitcherStatus.pitchesThrown}/{pitcherStatus.dailyMax}
                    </span>
                    <span className="text-phil-creamDim">
                      age {currentPitcher.age} · rest if out: {pitcherStatus.restDaysIfStopNow}d
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-ump-warn mt-0.5">No pitcher set for this inning.</div>
                )}
                {pitcherStatus && (
                  <div className="mt-1 h-1.5 rounded-full bg-ump-line overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        pitcherStatus.tier === 'over' || pitcherStatus.tier === 'red'
                          ? 'bg-grad-crit'
                          : pitcherStatus.tier === 'yellow'
                          ? 'bg-grad-amber'
                          : 'bg-grad-ok'
                      }`}
                      style={{ width: `${pitcherBarPct}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </button>
        )}

        <div className="grid grid-cols-3 gap-2">
          <button className="tap-btn tap-btn-ghost tap-btn-sm" onClick={() => setDefenseOpen(true)}>🧤 Defense</button>
          <button className="tap-btn tap-btn-ghost tap-btn-sm" onClick={() => setAbsentOpen(true)}>👥 Absent</button>
          <button className="tap-btn tap-btn-ghost tap-btn-sm" onClick={() => setUndoOpen(true)}>↶ Undo</button>
        </div>
      </main>

      <footer className="shrink-0 px-3 pt-2 pb-1 safe-bottom bg-phil-maroonDark/80 backdrop-blur border-t border-ump-line">
        <div className="grid grid-cols-3 gap-2 mb-2">
          <button className="tap-btn tap-btn-neutral tap-btn-lg" onClick={() => { haptic('light'); addPitch('ball'); }}>BALL</button>
          <button className="tap-btn tap-btn-primary tap-btn-lg" onClick={() => { haptic('medium'); addPitch('strike'); }}>STRIKE</button>
          <button className="tap-btn tap-btn-neutral tap-btn-lg" onClick={() => { haptic('light'); addPitch('foul'); }}>FOUL</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button className="tap-btn tap-btn-danger tap-btn-lg" onClick={() => { haptic('warning'); resolveAtBat('groundout', 0, 1); }}>OUT</button>
          <button className="tap-btn tap-btn-success tap-btn-lg" onClick={() => { haptic('medium'); setResolveOpen(true); }}>IN PLAY</button>
        </div>
      </footer>

      <ResolveAtBatModal
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        onResolve={async (r, rbis, outs) => {
          haptic(outs > 0 ? 'warning' : 'success');
          await resolveAtBat(r, rbis, outs);
          setResolveOpen(false);
        }}
      />

      <PitcherPicker
        open={pitcherOpen}
        title={`Pitcher — inning ${game.inning}`}
        gameDate={game.date}
        onClose={() => setPitcherOpen(false)}
        onPick={async (pid) => {
          await setPitcher(pid);
          setPitcherOpen(false);
        }}
        players={players.filter((p) => !game.absentPlayerIds.includes(p.id) && p.active)}
        allowDismiss={!!game.currentPitcherPlayerId}
      />

      <BaseActionMenu
        open={baseMenu != null}
        base={baseMenu}
        runnerName={baseMenu ? runnerOnBase(baseMenu) ?? undefined : undefined}
        onClose={() => setBaseMenu(null)}
        onChoose={handleBaseAction}
      />

      <UndoHistory
        open={undoOpen}
        gameId={game.id}
        onClose={() => setUndoOpen(false)}
        onUndoOne={async () => { haptic('warning'); await undoLast(); }}
        onUndoTo={async (eventId) => { haptic('warning'); await undoTo(eventId); }}
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
        footer={<button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => setMenuOpen(false)}>Close</button>}
      >
        <button className="tap-btn tap-btn-ghost tap-btn-lg w-full" onClick={() => { setMenuOpen(false); nav(`/game/${game.id}/scoreboard`); }}>
          Scoreboard mode
        </button>
        <button className="tap-btn tap-btn-ghost tap-btn-lg w-full" onClick={() => { setMenuOpen(false); setLegendOpen(true); }}>
          Show legend
        </button>
        <button className="tap-btn tap-btn-ghost tap-btn-lg w-full" onClick={() => { setMenuOpen(false); setPitcherOpen(true); }}>
          Change pitcher
        </button>
        <button className="tap-btn tap-btn-ghost tap-btn-lg w-full" onClick={() => { setMenuOpen(false); setDefenseOpen(true); }}>
          Defense rotation
        </button>
        <button
          className="tap-btn tap-btn-danger tap-btn-lg w-full"
          onClick={async () => {
            if (!confirm('Finalize this game? Locks pitch counts and saves rest days.')) return;
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
  const buttons: Array<{ r: AtBatResult; label: string; tone: 'primary' | 'success' | 'danger' | 'neutral' | 'violet'; outs: number }> = [
    { r: 'single', label: '1B', tone: 'success', outs: 0 },
    { r: 'double', label: '2B', tone: 'success', outs: 0 },
    { r: 'triple', label: '3B', tone: 'success', outs: 0 },
    { r: 'hr', label: 'HR', tone: 'violet', outs: 0 },
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
      <div className="flex items-center gap-3 mb-2 text-sm">
        <span className="field-label">RBIs</span>
        <Stepper value={rbis} onChange={setRbis} />
        <span className="text-[11px] text-phil-creamDim">runs auto from bases</span>
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
      <button className="tap-btn tap-btn-ghost tap-btn-sm" onClick={() => onChange(Math.max(0, value - 1))}>−</button>
      <span className="w-6 text-center font-bold text-lg">{value}</span>
      <button className="tap-btn tap-btn-ghost tap-btn-sm" onClick={() => onChange(value + 1)}>+</button>
    </div>
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
          <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={onClose}>Cancel</button>
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
                <div className="w-10 font-mono text-sm text-phil-creamDim">{pos}</div>
                <select
                  className="input"
                  value={current?.playerId ?? ''}
                  onChange={(e) => updatePos(pos, e.target.value)}
                >
                  <option value="">— none —</option>
                  {allPlayers.map((ap) => (
                    <option key={ap.id} value={ap.id}>{ap.displayName}</option>
                  ))}
                </select>
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
      <p className="text-xs text-phil-creamDim">Tap a player to toggle absent. Absent players are excluded from lineup and rotation.</p>
      <ul className="grid grid-cols-2 gap-2 mt-2">
        {players.map((p) => {
          const isAbsent = absent.has(p.id);
          return (
            <li key={p.id}>
              <button
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  isAbsent ? 'border-ump-crit/60 bg-ump-crit/10 text-ump-crit line-through' : 'border-ump-line bg-phil-maroon text-phil-cream'
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
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-phil-maroonDarker border border-ump-line text-sm font-bold">
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
