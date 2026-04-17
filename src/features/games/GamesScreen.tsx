import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { useApp } from '@/app/AppContext';
import { gamesRepo } from '@/db/repositories';
import type { Game } from '@/types';
import EmptyState from '@/components/EmptyState';

export default function GamesScreen() {
  const { team } = useApp();
  const [games, setGames] = useState<Game[]>([]);
  useEffect(() => {
    if (!team) return;
    void (async () => {
      const list = await gamesRepo.byTeam(team.id);
      list.sort((a, b) => b.date - a.date);
      setGames(list);
    })();
  }, [team]);

  return (
    <div className="pb-24">
      <Header title="Games" subtitle={`${games.length} total`} />
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        {games.length === 0 ? (
          <EmptyState title="No games yet" description="Start a new game from the Home tab." />
        ) : (
          <ul className="space-y-2">
            {games.map((g) => (
              <li key={g.id}>
                <Link to={`/game/${g.id}`} className="card flex items-center justify-between">
                  <div>
                    <div className="font-semibold">vs {g.opponent}</div>
                    <div className="text-xs text-ump-dim">
                      {new Date(g.date).toLocaleDateString()} · {g.status}
                    </div>
                  </div>
                  <div className="font-mono font-bold">
                    {g.awayScore}-{g.homeScore}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
