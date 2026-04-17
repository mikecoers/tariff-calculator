import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/app/AppContext';
import { useGame, opponentIsBatting } from '@/features/scoring/useGame';

export default function ScoreboardScreen() {
  const { gameId } = useParams();
  const nav = useNavigate();
  const { settings } = useApp();
  const { game, loading, playersById } = useGame(gameId, settings);

  useEffect(() => {
    if (!loading && !game) nav('/games', { replace: true });
  }, [loading, game, nav]);

  useEffect(() => {
    // Request wake lock to keep the screen on, if supported
    let lock: unknown = null;
    const nav: any = navigator;
    if (nav?.wakeLock?.request) {
      nav.wakeLock.request('screen').then((l: unknown) => (lock = l)).catch(() => {});
    }
    return () => {
      (lock as { release?: () => void } | null)?.release?.();
    };
  }, []);

  if (loading || !game) return <div className="p-4 text-phil-maroon/70">Loading…</div>;

  const usHome = game.homeAway === 'home';
  const usScore = usHome ? game.homeScore : game.awayScore;
  const oppScore = usHome ? game.awayScore : game.homeScore;
  const oppBatting = opponentIsBatting(game);

  const runners = [
    game.firstBasePlayerId ? playersById.get(game.firstBasePlayerId)?.displayName : null,
    game.secondBasePlayerId ? playersById.get(game.secondBasePlayerId)?.displayName : null,
    game.thirdBasePlayerId ? playersById.get(game.thirdBasePlayerId)?.displayName : null
  ];

  return (
    <div className="h-dvh w-full flex flex-col safe-top safe-bottom overflow-hidden">
      <div className="px-4 py-2 flex items-center justify-between text-xs text-phil-maroon/70">
        <button className="tap-btn tap-btn-ghost tap-btn-sm" onClick={() => nav(`/game/${game.id}`)}>
          ← Back to game
        </button>
        <span className="uppercase tracking-widest">Scoreboard</span>
        <span className="w-20 text-right">vs {game.opponent}</span>
      </div>

      <div className="flex-1 flex flex-col justify-center px-4">
        <div className="grid grid-cols-2 gap-3">
          <ScoreCell label={game.opponent} active={oppBatting} value={oppScore} tone="warn" />
          <ScoreCell label="Phillies" active={!oppBatting} value={usScore} tone="ok" />
        </div>

        <div className="mt-6 text-center">
          <div className="text-phil-maroon/70 uppercase tracking-widest text-xs">Inning</div>
          <div className="font-display text-[120px] leading-none tracking-widest text-phil-maroonDark">
            {game.halfInning === 'top' ? '▲' : '▼'}
            {game.inning}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Cell label="Balls" value={game.balls} />
          <Cell label="Strikes" value={game.strikes} />
          <Cell label="Outs" value={game.outs} />
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-phil-maroon/70">
          Runners: {runners.filter(Boolean).length
            ? runners
                .map((n, i) => (n ? `${['1B','2B','3B'][i]}: ${n}` : null))
                .filter(Boolean)
                .join(' · ')
            : 'Bases empty'}
        </div>
      </div>
    </div>
  );
}

function ScoreCell({
  label,
  value,
  active,
  tone
}: {
  label: string;
  value: number;
  active: boolean;
  tone: 'ok' | 'warn';
}) {
  const activeClass =
    tone === 'ok'
      ? 'border-ump-ok/80 shadow-glowOk'
      : 'border-ump-warn/80 shadow-glow';
  return (
    <div
      className={`rounded-2xl border p-4 text-center transition ${
        active ? `border-2 ${activeClass}` : 'border-ump-line'
      }`}
    >
      <div
        className={`uppercase tracking-widest text-sm ${
          active ? (tone === 'ok' ? 'text-ump-ok' : 'text-ump-warn') : 'text-phil-maroon/70'
        } font-bold truncate`}
      >
        {label}
      </div>
      <div className="font-mono text-[96px] leading-none font-black text-phil-maroonDark">{value}</div>
      {active && <div className="text-[10px] text-phil-maroon/70 mt-1">AT BAT</div>}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-ump-line p-3 text-center">
      <div className="uppercase text-[10px] tracking-widest text-phil-maroon/70">{label}</div>
      <div className="font-mono text-5xl font-black text-phil-maroonDark">{value}</div>
    </div>
  );
}
