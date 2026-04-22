import { useCallback, useRef, useState } from 'react';
import { spotifySearch, type SpotifySearchResult } from '../sources/SpotifySource';
import { appleMusicSearch, type AppleMusicSearchResult } from '../sources/AppleMusicSource';

type Backend = 'spotify' | 'apple';

interface TrackSearchProps {
  backend: Backend;
  onPick: (result: SpotifySearchResult | AppleMusicSearchResult) => void;
  accent: string;
}

export default function TrackSearch({ backend, onPick, accent }: TrackSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<(SpotifySearchResult | AppleMusicSearchResult)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      setError(null);
      const myReq = ++reqId.current;
      try {
        const r =
          backend === 'spotify' ? await spotifySearch(q) : await appleMusicSearch(q);
        if (myReq === reqId.current) {
          setResults(r);
        }
      } catch (err) {
        if (myReq === reqId.current) {
          setError(String((err as Error).message ?? err));
          setResults([]);
        }
      } finally {
        if (myReq === reqId.current) setLoading(false);
      }
    },
    [backend]
  );

  return (
    <div className="flex flex-col gap-2">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void doSearch(query);
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${backend === 'spotify' ? 'Spotify' : 'Apple Music'}`}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-[16px] placeholder-white/30 focus:outline-none focus:border-white/30 font-mono"
          inputMode="search"
          autoCapitalize="off"
          autoCorrect="off"
        />
        <button
          type="submit"
          className="neon-btn shrink-0"
          style={{ color: accent, boxShadow: `0 0 14px -6px ${accent}` }}
          disabled={loading}
        >
          {loading ? '…' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="text-[11px] font-mono text-red-300 bg-red-500/10 rounded px-2 py-1 border border-red-500/20">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <ul className="panel-inset max-h-56 overflow-y-auto divide-y divide-white/5">
          {results.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => onPick(r)}
                className="w-full flex items-center gap-2 px-2 py-2 text-left hover:bg-white/5 active:bg-white/10 transition-colors"
              >
                {r.artworkUrl ? (
                  <img
                    src={r.artworkUrl}
                    alt=""
                    className="w-10 h-10 rounded object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded shrink-0"
                    style={{ background: `${accent}22` }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white/90 truncate">{r.title}</div>
                  <div className="text-[10px] font-mono text-white/50 truncate">{r.artist}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
