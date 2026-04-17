import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import PrimaryButton from '@/components/PrimaryButton';
import { useApp } from '@/app/AppContext';
import { gamesRepo, lineupsRepo, playersRepo } from '@/db/repositories';
import type { Player } from '@/types';
import { now } from '@/lib/id';
import { recommendBattingOrder } from '@/features/lineups/lineupRecommendationEngine';

export default function NewGameScreen() {
  const { team, settings } = useApp();
  const nav = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [opponent, setOpponent] = useState('');
  const [location, setLocation] = useState('');
  const [homeAway, setHomeAway] = useState<'home' | 'away'>('home');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [absent, setAbsent] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!team) return;
    void (async () => {
      const list = await playersRepo.activeByTeam(team.id);
      list.sort((a, b) => a.lastName.localeCompare(b.lastName));
      setPlayers(list);
    })();
  }, [team]);

  const available = useMemo(() => players.filter((p) => !absent.has(p.id)), [players, absent]);

  if (!team || !settings) return <div className="p-4">Set up your team first.</div>;

  const start = async () => {
    if (available.length < 9) {
      alert(`You need at least 9 available players. Currently ${available.length}.`);
      return;
    }
    const game = await gamesRepo.create({
      teamId: team.id,
      opponent: opponent || 'Opponent',
      date: new Date(date).getTime(),
      location,
      homeAway,
      status: 'in_progress',
      seasonPhase: settings.seasonPhase,
      inning: 1,
      halfInning: homeAway === 'home' ? 'top' : 'top',
      outs: 0,
      balls: 0,
      strikes: 0,
      homeScore: 0,
      awayScore: 0,
      runsThisInning: 0,
      currentBatterSlot: 0,
      elapsedSeconds: 0,
      startTime: now(),
      rosterPlayerIds: available.map((p) => p.id),
      absentPlayerIds: Array.from(absent),
      opponentBatterNumber: 1,
      firstBasePlayerId: null,
      secondBasePlayerId: null,
      thirdBasePlayerId: null,
      coachPitchActive: false
    });
    await lineupsRepo.upsert({
      gameId: game.id,
      inning: 1,
      battingOrder: recommendBattingOrder(available),
      benchPlayerIds: [],
      dhEnabled: settings.dhEnabled
    });
    nav(`/game/${game.id}`);
  };

  return (
    <div className="pb-24">
      <Header title="New game" subtitle="Under 5 minutes to start" />
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <label className="block">
          <span className="field-label">Opponent</span>
          <input className="input mt-1" value={opponent} onChange={(e) => setOpponent(e.target.value)} />
        </label>
        <label className="block">
          <span className="field-label">Location</span>
          <input
            className="input mt-1"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="block">
          <span className="field-label">Date</span>
          <input type="date" className="input mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div>
          <span className="field-label">Home or away</span>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              className={`tap-btn ${homeAway === 'home' ? 'tap-btn-success' : 'tap-btn-neutral'} tap-btn-lg`}
              onClick={() => setHomeAway('home')}
            >
              Home
            </button>
            <button
              className={`tap-btn ${homeAway === 'away' ? 'tap-btn-success' : 'tap-btn-neutral'} tap-btn-lg`}
              onClick={() => setHomeAway('away')}
            >
              Away
            </button>
          </div>
        </div>

        <section>
          <div className="flex items-center justify-between">
            <span className="field-label">Availability — {available.length} present · {absent.size} absent</span>
            <div className="flex gap-1">
              <button
                className="tap-btn tap-btn-sm tap-btn-neutral"
                onClick={() => setAbsent(new Set())}
              >
                All present
              </button>
            </div>
          </div>
          <p className="text-xs text-ump-dim mb-2 mt-1">
            Tap a player to mark absent. Absent players are excluded from the lineup and rotation engine.
          </p>
          <ul className="grid grid-cols-2 gap-2">
            {players.map((p) => {
              const isAbsent = absent.has(p.id);
              return (
                <li key={p.id}>
                  <button
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      isAbsent
                        ? 'border-ump-crit/60 bg-ump-crit/10 text-ump-crit line-through'
                        : 'border-ump-line bg-ump-card text-ump-ink'
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
                        {p.jerseyNumber || initials(p)}
                      </span>
                      <span className="text-sm font-medium truncate">{p.displayName || `${p.firstName} ${p.lastName[0]}.`}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <PrimaryButton
          size="xl"
          className="w-full"
          onClick={start}
          disabled={!opponent.trim() || available.length < 9}
        >
          Start game
        </PrimaryButton>
      </div>
    </div>
  );
}

function initials(p: Player): string {
  return `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase();
}
