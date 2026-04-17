import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/app/AppContext';
import { gamesRepo, playersRepo } from '@/db/repositories';
import type { Game, Player } from '@/types';
import EmptyState from '@/components/EmptyState';
import PrimaryButton from '@/components/PrimaryButton';
import { describePhase } from '@/features/rules/seasonPhaseRules';
import { seedPhilliesRoster } from '@/features/roster/seed';

export default function HomeScreen() {
  const { team, settings, createTeam } = useApp();
  const nav = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [roster, setRoster] = useState<Player[]>([]);
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    if (!team) return;
    void (async () => {
      const gs = await gamesRepo.byTeam(team.id);
      gs.sort((a, b) => b.date - a.date);
      setGames(gs);
      setRoster(await playersRepo.activeByTeam(team.id));
    })();
  }, [team]);

  if (!team) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-4">
        <h1 className="text-3xl font-bold mt-6">Kid Pitch Coach</h1>
        <p className="text-ump-dim">Set up your team to get started. Works offline — all data stays on this device.</p>
        <label className="block">
          <span className="field-label">Team name</span>
          <input
            className="input mt-1"
            placeholder="e.g. River Valley Rookies"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
        </label>
        <PrimaryButton
          disabled={!teamName.trim()}
          onClick={async () => {
            const name = teamName.trim();
            const t = await createTeam(name, new Date().getFullYear());
            if (!t) return;
            if (/phillies/i.test(name)) {
              await seedPhilliesRoster(t.id, false);
            }
            nav('/roster');
          }}
        >
          Create team
        </PrimaryButton>
        <p className="text-xs text-ump-dim">
          Tip: naming your team "Phillies" auto-loads the 12-player roster.
        </p>
      </div>
    );
  }

  const inProgress = games.find((g) => g.status === 'in_progress');
  const recent = games.filter((g) => g.status === 'completed').slice(0, 3);
  const phase = settings ? describePhase(settings.seasonPhase) : null;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto pb-24">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <p className="text-xs text-ump-dim">Season {team.seasonYear}</p>
        </div>
        {phase && (
          <span className="chip-info">{phase.label}</span>
        )}
      </header>

      {inProgress ? (
        <div className="card border-ump-accent/70">
          <div className="text-xs text-ump-accent font-semibold uppercase">Game in progress</div>
          <div className="text-lg font-bold mt-1">vs {inProgress.opponent}</div>
          <div className="text-sm text-ump-dim mb-3">
            Inning {inProgress.inning} {inProgress.halfInning === 'top' ? '▲' : '▼'} · {inProgress.awayScore}-{inProgress.homeScore}
          </div>
          <PrimaryButton size="lg" onClick={() => nav(`/game/${inProgress.id}`)}>
            Resume game →
          </PrimaryButton>
        </div>
      ) : (
        <PrimaryButton
          size="xl"
          className="w-full"
          onClick={() => nav('/new-game')}
          disabled={roster.length < 9}
        >
          ⚾ Start New Game
        </PrimaryButton>
      )}

      {roster.length < 9 && (
        <div className="card">
          <p className="text-sm text-ump-warn">Add at least 9 players to your roster before starting a game.</p>
          <Link to="/roster" className="tap-btn tap-btn-primary tap-btn-sm mt-2 inline-block">Manage roster</Link>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3">
        <Link to="/roster" className="card text-center">
          <div className="text-3xl">👥</div>
          <div className="mt-1 font-semibold">Roster</div>
          <div className="text-xs text-ump-dim">{roster.length} active</div>
        </Link>
        <Link to="/pitchers" className="card text-center">
          <div className="text-3xl">🎯</div>
          <div className="mt-1 font-semibold">Pitchers</div>
          <div className="text-xs text-ump-dim">Rest tracker</div>
        </Link>
        <Link to="/games" className="card text-center">
          <div className="text-3xl">📅</div>
          <div className="mt-1 font-semibold">Games</div>
          <div className="text-xs text-ump-dim">{games.length} total</div>
        </Link>
        <Link to="/stats" className="card text-center">
          <div className="text-3xl">📊</div>
          <div className="mt-1 font-semibold">Stats</div>
          <div className="text-xs text-ump-dim">Season</div>
        </Link>
      </section>

      <section>
        <h2 className="field-label mb-2">Recent games</h2>
        {recent.length === 0 ? (
          <EmptyState icon="📅" title="No games yet" description="Your completed games will appear here." />
        ) : (
          <ul className="space-y-2">
            {recent.map((g) => (
              <li key={g.id}>
                <Link to={`/game/${g.id}`} className="card flex justify-between items-center">
                  <div>
                    <div className="font-semibold">vs {g.opponent}</div>
                    <div className="text-xs text-ump-dim">{new Date(g.date).toLocaleDateString()}</div>
                  </div>
                  <div className="text-lg font-mono">
                    {g.awayScore}-{g.homeScore}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
