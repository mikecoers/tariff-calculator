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
import CountDisplay from '@/components/CountDisplay';
import Lineup from '@/components/Lineup';
import RulesPlaybook from '@/components/RulesPlaybook';
import GameSidePanel from '@/components/GameSidePanel';
import { pitchLimitStatus } from '@/features/rules/pitchingRules';
import { recommendDefensiveLineup, autoFillOpenPositions } from '@/features/lineups/lineupRecommendationEngine';
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
  const [lineupOpen, setLineupOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [baseMenu, setBaseMenu] = useState<BaseKey | null>(null);
  const [flash, setFlash] = useState(0);
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
    reorderLineup,
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
  const orderLen = lineup?.battingOrder.length ?? 1;
  const onDeckId = lineup && game
    ? lineup.battingOrder[(game.currentBatterSlot + 1) % Math.max(1, orderLen)]
    : undefined;
  const onDeck = onDeckId ? playersById.get(onDeckId) : undefined;
  const inHoleId = lineup && game
    ? lineup.battingOrder[(game.currentBatterSlot + 2) % Math.max(1, orderLen)]
    : undefined;
  const inHole = inHoleId ? playersById.get(inHoleId) : undefined;

  const inningDefCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of defense) {
      if (d.inning > game?.inning!) continue;
      map.set(d.playerId, (map.get(d.playerId) ?? 0) + 1);
    }
    return map;
  }, [defense, game?.inning]);

  const currentPitcher = game?.currentPitcherPlayerId ? playersById.get(game.currentPitcherPlayerId) : undefined;
  const pitcherPitches = useMemo(() => {
    if (!game?.currentPitcherPlayerId) return 0;
    return pitchEvents.filter((p) => p.pitcherPlayerId === game.currentPitcherPlayerId).length;
  }, [pitchEvents, game?.currentPitcherPlayerId]);
  const pitcherStatus =
    settings && currentPitcher ? pitchLimitStatus(pitcherPitches, currentPitcher.age, settings) : null;

  const criticalAlerts = liveAlerts.filter((a) => a.severity === 'critical');
  const warnings = liveAlerts.filter((a) => a.severity === 'warning');

  if (loading || !game || !settings) return <div className="p-4 text-phil-maroon">Loading…</div>;

  const oppBatting = opponentIsBatting(game);
  const ourBatting = !oppBatting;
  const coachPitch = settings.seasonPhase === 'early' && ourBatting;

  const firstName = game.firstBasePlayerId ? playersById.get(game.firstBasePlayerId)?.displayName : null;
  const secondName = game.secondBasePlayerId ? playersById.get(game.secondBasePlayerId)?.displayName : null;
  const thirdName = game.thirdBasePlayerId ? playersById.get(game.thirdBasePlayerId)?.displayName : null;

  const usAreHome = game.homeAway === 'home';
  const usScore = usAreHome ? game.homeScore : game.awayScore;
  const oppScore = usAreHome ? game.awayScore : game.homeScore;

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

  const withFlash = (fn: () => void) => {
    fn();
    setFlash((x) => x + 1);
  };

  const halfLabel = game.halfInning === 'top' ? 'TOP' : 'BOT';
  const firstAlert = criticalAlerts[0] ?? warnings[0];

  return (
    <div className="h-dvh flex flex-col overflow-hidden safe-top">
      {/* HEADER ---------------------------------------------------------- */}
      <header className="shrink-0 px-3 pt-1 pb-2">
        <div className="flex items-center justify-between">
          <button
            className="h-8 w-8 rounded-full glass flex items-center justify-center text-phil-maroonDark text-sm"
            onClick={() => nav('/home')}
            aria-label="Exit"
          >
            ✕
          </button>
          <div className="text-[12px] uppercase tracking-[0.2em] font-black text-phil-maroonDark">
            vs {game.opponent}
          </div>
          <button
            className="h-8 w-8 rounded-full glass flex items-center justify-center text-phil-maroonDark text-sm"
            onClick={() => setMenuOpen(true)}
            aria-label="Menu"
          >
            ⋯
          </button>
        </div>

        {/* Hero score */}
        <div
          key={flash}
          className={`mt-2 glass-solid rounded-2xl px-3 py-2.5 flex items-center justify-between ${flash ? 'animate-flash' : ''}`}
        >
          <div className="flex-1 text-center">
            <div className={`text-[11px] uppercase tracking-[0.14em] font-black ${oppBatting ? 'text-amber-800' : 'text-phil-maroon'}`}>{game.opponent}</div>
            <div className="font-mono text-5xl font-black leading-none text-phil-maroonDark">{oppScore}</div>
            {oppBatting && <div className="mt-1 inline-block chip-warn">AT BAT</div>}
          </div>
          <div className="mx-3 self-stretch border-l-2 border-phil-maroon/20" />
          <div className="flex-1 text-center">
            <div className={`text-[11px] uppercase tracking-[0.14em] font-black ${ourBatting ? 'text-phil-maroonDark' : 'text-phil-maroon'}`}>Phillies</div>
            <div className="font-mono text-5xl font-black leading-none text-phil-maroonDark">{usScore}</div>
            {ourBatting && <div className="mt-1 inline-block chip-maroon">AT BAT</div>}
          </div>
        </div>

        {/* Inning · Count · Outs — one tight line */}
        <div className="mt-2 flex items-center justify-between px-1 gap-2">
          <span className="text-[13px] font-black tracking-wider text-phil-maroonDark whitespace-nowrap">
            {halfLabel} {game.inning}
          </span>
          <CountDisplay
            balls={game.balls}
            strikes={game.strikes}
            outs={game.outs}
            coachPitch={!!game.coachPitchActive}
          />
          {game.coachPitchActive ? (
            <span className="chip-warn">CP</span>
          ) : (
            <span className="w-0" />
          )}
        </div>

        {/* Batter / opp-at-bat strip — flat, one line */}
        {ourBatting && batter ? (
          <button
            onClick={() => { haptic('light'); setLineupOpen(true); }}
            className="mt-2 w-full text-left glass-solid rounded-2xl px-3 py-2 flex items-center gap-2"
          >
            <div className="h-10 w-10 rounded-full bg-phil-maroon text-phil-cream flex items-center justify-center text-[13px] font-black shrink-0">
              #{game.currentBatterSlot + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-[16px] text-phil-maroonDark truncate leading-tight">
                {batter.displayName}
              </div>
              <div className="text-[12px] text-phil-maroonDark truncate leading-tight font-semibold">
                {onDeck && <>Next: <b className="text-phil-maroonDark">{onDeck.displayName}</b></>}
                {inHole && <span className="text-phil-maroon"> · then {inHole.displayName}</span>}
              </div>
            </div>
            <span className="chip-info shrink-0">LINEUP →</span>
          </button>
        ) : (
          oppBatting && (
            <div className="mt-2 glass-solid rounded-2xl px-3 py-2 flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-amber-600 text-white flex items-center justify-center text-[13px] font-black shrink-0">
                #{game.opponentBatterNumber ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-[16px] text-phil-maroonDark leading-tight">
                  Opp batter #{game.opponentBatterNumber ?? '?'}
                </div>
                <div className="text-[11px] text-phil-maroon font-semibold leading-tight">Tap next when they change</div>
              </div>
              <button
                className="tap-btn tap-btn-maroon tap-btn-sm shrink-0"
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
          )
        )}

        {/* Context chips — playing-time + alerts */}
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          <PlayingTimeBanner players={players} assignments={defense} game={game} settings={settings} />
          {firstAlert && (
            <span className={firstAlert.severity === 'critical' ? 'chip-crit' : 'chip-warn'}>
              {firstAlert.severity === 'critical' ? '⚠' : '!'} {firstAlert.message}
              {liveAlerts.length > 1 && <span className="opacity-70 ml-1">+{liveAlerts.length - 1}</span>}
            </span>
          )}
        </div>
      </header>

      {/* MAIN — diamond only --------------------------------------------- */}
      <main className="flex-1 min-h-0 overflow-hidden px-3 flex flex-col gap-1.5">
        <div className="flex-1 min-h-0 flex items-stretch gap-2">
          <div className="flex-1 flex items-center justify-center min-h-0">
            <Diamond
              batterName={ourBatting ? batter?.displayName : null}
              firstName={firstName}
              secondName={secondName}
              thirdName={thirdName}
              outs={game.outs}
              balls={game.balls}
              strikes={game.strikes}
              compact
              onBaseTap={(base) => {
                if (!ourBatting) return;
                if (runnerOnBase(base)) {
                  haptic('light');
                  setBaseMenu(base);
                }
              }}
            />
          </div>
          <div className="w-[42%] max-w-[170px] min-h-0 flex">
            <GameSidePanel
              mode={ourBatting ? 'bat' : 'defense'}
              lineup={lineup}
              playersById={playersById}
              defense={defense}
              currentBatterSlot={game.currentBatterSlot}
              currentPitcherId={game.currentPitcherPlayerId}
              absentIds={game.absentPlayerIds}
              allPlayers={players}
              currentInning={game.inning}
            />
          </div>
        </div>

        {game.lastPlay && (
          <div className="text-center text-[12px] text-phil-maroonDark font-semibold truncate leading-tight">
            <span className="text-phil-maroon">LAST:</span> <b>{game.lastPlay}</b>
          </div>
        )}

        {oppBatting && (
          <button
            onClick={() => { haptic('light'); setPitcherOpen(true); }}
            className="w-full text-left glass-solid rounded-2xl px-3 py-1.5 flex items-center gap-2"
          >
            <div className="min-w-0 flex-1">
              <div className="label">Our pitcher · inn {game.inning}</div>
              <div className="font-black text-[15px] text-phil-maroonDark truncate leading-tight">
                {currentPitcher?.displayName ?? 'Tap to select'}
              </div>
            </div>
            {pitcherStatus && currentPitcher ? (
              <div className="flex flex-col items-end gap-1 shrink-0">
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
                <div className="w-20 h-1.5 rounded-full bg-phil-maroon/20 overflow-hidden">
                  <div
                    className={`h-full ${
                      pitcherStatus.tier === 'over' || pitcherStatus.tier === 'red'
                        ? 'bg-red-700'
                        : pitcherStatus.tier === 'yellow'
                        ? 'bg-amber-600'
                        : 'bg-emerald-600'
                    }`}
                    style={{ width: `${Math.min(100, (pitcherStatus.pitchesThrown / Math.max(1, pitcherStatus.dailyMax)) * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <span className="chip-warn">no pitcher</span>
            )}
          </button>
        )}
      </main>

      {/* FOOTER — equal-weight pitch row + semantic outcome row ---------- */}
      <footer className="shrink-0 px-3 pt-2 pb-1 safe-bottom">
        <div className="flex gap-1.5">
          <button
            className="tap-btn tap-btn-neutral tap-btn-md flex-1"
            disabled={!!game.coachPitchActive}
            onClick={() => withFlash(() => { haptic('light'); addPitch('ball'); })}
          >
            Ball
          </button>
          <button
            className={`tap-btn tap-btn-neutral tap-btn-md flex-1 ${game.coachPitchActive ? 'ring-2 ring-amber-600' : ''}`}
            onClick={() => withFlash(() => { haptic('medium'); addPitch('strike'); })}
          >
            Strike
          </button>
          <button
            className="tap-btn tap-btn-neutral tap-btn-md flex-1"
            onClick={() => withFlash(() => { haptic('light'); addPitch('foul'); })}
          >
            Foul
          </button>
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <button
            className="tap-btn tap-btn-danger tap-btn-md"
            onClick={() => withFlash(() => { haptic('warning'); resolveAtBat('groundout', 0, 1); })}
          >
            Out
          </button>
          <button
            className="tap-btn tap-btn-success tap-btn-md animate-none"
            onClick={() => withFlash(() => { haptic('rumble'); setResolveOpen(true); })}
          >
            Hit
          </button>
        </div>

        {/* Quick actions — icon + label, equal weight */}
        <div className="mt-1.5 grid grid-cols-5 gap-1.5">
          <QuickAction icon="📋" label="Lineup" onClick={() => setLineupOpen(true)} />
          <QuickAction icon="🧤" label="Defense" onClick={() => setDefenseOpen(true)} />
          <QuickAction icon="👥" label="Subs" onClick={() => setAbsentOpen(true)} />
          <QuickAction icon="↶" label="Undo" onClick={() => setUndoOpen(true)} />
          <QuickAction icon="📒" label="Rules" onClick={() => setRulesOpen(true)} />
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

      <Lineup
        open={lineupOpen}
        onClose={() => setLineupOpen(false)}
        lineup={lineup}
        playersById={playersById}
        atBats={g.atBats}
        defenseThisInning={defense.filter((d) => d.inning === game.inning)}
        inningDefenseCounts={inningDefCounts}
        currentBatterSlot={game.currentBatterSlot}
        onReorder={reorderLineup}
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

      <RulesPlaybook open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <Modal
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Game menu"
        footer={<button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => setMenuOpen(false)}>Close</button>}
      >
        <button className="tap-btn tap-btn-neutral tap-btn-lg w-full" onClick={() => { setMenuOpen(false); nav(`/game/${game.id}/scoreboard`); }}>
          Scoreboard mode
        </button>
        <button className="tap-btn tap-btn-neutral tap-btn-lg w-full" onClick={() => { setMenuOpen(false); setLegendOpen(true); }}>
          Legend
        </button>
        <button className="tap-btn tap-btn-neutral tap-btn-lg w-full" onClick={() => { setMenuOpen(false); setPitcherOpen(true); }}>
          Change pitcher
        </button>
        <button className="tap-btn tap-btn-neutral tap-btn-lg w-full" onClick={() => { setMenuOpen(false); setDefenseOpen(true); }}>
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

function QuickAction({
  icon,
  label,
  onClick
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-2xl bg-white/85 border border-phil-maroon/30 text-phil-maroonDark
                 flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[48px]
                 transition active:scale-[0.97] active:bg-white"
      onClick={onClick}
      aria-label={label}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="text-[9px] font-black uppercase tracking-wider leading-none">{label}</span>
    </button>
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
  const buttons: Array<{ r: AtBatResult; label: string; tone: 'neutral' | 'success' | 'danger' | 'violet'; outs: number }> = [
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
        <span className="label">RBIs</span>
        <Stepper value={rbis} onChange={setRbis} />
        <span className="text-[11px] text-phil-maroon">runs auto from bases</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {buttons.map((b) => (
          <button
            key={b.r}
            className={`tap-btn tap-btn-${b.tone} tap-btn-md`}
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
      <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => onChange(Math.max(0, value - 1))}>−</button>
      <span className="w-6 text-center font-bold text-lg">{value}</span>
      <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => onChange(value + 1)}>+</button>
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
  const [activePlayers, setActivePlayers] = useState<import('@/types').Player[]>([]);
  const [priorAssigns, setPriorAssigns] = useState<import('@/types').DefensiveAssignment[]>([]);
  const [gameSnap, setGameSnap] = useState<import('@/types').Game | null>(null);
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
      setActivePlayers(active);
      setGameSnap(game);
      const prior = await defenseRepo.forGame(game.id);
      setPriorAssigns(prior);
      // Lock current pitcher so the rotation engine doesn't reassign them
      const locked: Array<{ playerId: string; position: Position }> = [];
      if (game.currentPitcherPlayerId && active.find((p) => p.id === game.currentPitcherPlayerId)) {
        locked.push({ playerId: game.currentPitcherPlayerId, position: 'P' });
      }
      const result = recommendDefensiveLineup({
        players: active,
        game,
        nextInning: game.inning,
        settings,
        priorAssignments: prior,
        lockedAssignments: locked
      });
      setRec(result.assignments);
      setLoading(false);
    })();
  }, [open, gameId, settings]);

  const updatePos = (pos: Position, pid: string) => {
    setRec((prev) => {
      // Remove the new player from any previous slot AND clear the target slot
      const without = prev.filter((r) => r.position !== pos && r.playerId !== pid);
      const next = pid
        ? [...without, { playerId: pid, position: pos, reason: 'Manual pick' }]
        : without;
      // Auto-fill any newly-empty positions from the bench (highest-need first)
      if (!gameSnap || !settings) return next;
      const usedIds = new Set(next.map((r) => r.playerId));
      const bench = activePlayers.filter((p) => !usedIds.has(p.id)).map((p) => p.id);
      return autoFillOpenPositions({
        current: next,
        benchPlayerIds: bench,
        players: activePlayers,
        game: gameSnap,
        settings,
        priorAssignments: priorAssigns
      });
    });
  };

  const reroll = () => {
    if (!gameSnap || !settings) return;
    const locked: Array<{ playerId: string; position: Position }> = [];
    if (gameSnap.currentPitcherPlayerId && activePlayers.find((p) => p.id === gameSnap.currentPitcherPlayerId)) {
      locked.push({ playerId: gameSnap.currentPitcherPlayerId, position: 'P' });
    }
    const result = recommendDefensiveLineup({
      players: activePlayers,
      game: gameSnap,
      nextInning: gameSnap.inning,
      settings,
      priorAssignments: priorAssigns,
      lockedAssignments: locked
    });
    setRec(result.assignments);
  };

  const usedIds = new Set(rec.map((r) => r.playerId));
  const benchView = activePlayers.filter((p) => !usedIds.has(p.id));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Defense — inning ${gameSnap?.inning ?? ''}`}
      footer={
        <>
          <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={reroll}>🎲 Re-roll</button>
          <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={onClose}>Cancel</button>
          <button
            className="tap-btn tap-btn-maroon tap-btn-sm"
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
        <div className="space-y-3">
          <p className="text-[11px] text-phil-maroon">
            Auto-randomized to even out playing time. Pitcher is locked from your pick.
            Swap anyone — the bench fills in automatically.
          </p>
          <div className="space-y-1.5">
            {DEFENSIVE_POSITIONS.map((pos) => {
              const current = rec.find((r) => r.position === pos);
              const isLockedP = pos === 'P' && current?.playerId === gameSnap?.currentPitcherPlayerId;
              return (
                <div key={pos} className="flex items-center gap-2">
                  <div className="w-10 font-mono text-sm font-black text-phil-maroonDark">{pos}</div>
                  <select
                    className="input"
                    value={current?.playerId ?? ''}
                    onChange={(e) => updatePos(pos, e.target.value)}
                    disabled={isLockedP}
                  >
                    <option value="">— none —</option>
                    {allPlayers.map((ap) => (
                      <option key={ap.id} value={ap.id}>{ap.displayName}</option>
                    ))}
                  </select>
                  {isLockedP && <span className="chip-info">PITCHER</span>}
                  {!current && !isLockedP && <span className="text-xs text-ump-warn font-bold">unfilled</span>}
                </div>
              );
            })}
          </div>
          {benchView.length > 0 && (
            <div className="rounded-xl border border-phil-maroon/30 bg-phil-blueLight px-2 py-2">
              <div className="label mb-1">Bench · {benchView.length}</div>
              <div className="flex flex-wrap gap-1">
                {benchView.map((p) => (
                  <span key={p.id} className="chip-info">{p.displayName}</span>
                ))}
              </div>
            </div>
          )}
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
          <button className="tap-btn tap-btn-maroon tap-btn-sm" onClick={() => onSave(Array.from(absent))}>Save</button>
        </>
      }
    >
      <p className="text-xs text-phil-maroon">Tap a player to toggle absent. Absent players are excluded from lineup and rotation.</p>
      <ul className="grid grid-cols-2 gap-2 mt-2">
        {players.map((p) => {
          const isAbsent = absent.has(p.id);
          return (
            <li key={p.id}>
              <button
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  isAbsent ? 'border-ump-crit/60 bg-ump-crit/10 text-ump-crit line-through' : 'glass text-phil-maroonDark'
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
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/80 border border-white/80 text-sm font-bold">
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
