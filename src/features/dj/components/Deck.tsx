import { useEffect, useMemo, useState } from 'react';
import type { DeckSource, DeckSourceState, SourceKind } from '../sources/types';
import { DirectAudioSource } from '../sources/DirectAudioSource';
import { SpotifySource } from '../sources/SpotifySource';
import { AppleMusicSource, getDeveloperToken } from '../sources/AppleMusicSource';
import { getStoredToken } from '../sources/spotifyAuth';
import { formatTime } from '../utils/youtube';
import Turntable from './Turntable';
import Knob from './Knob';
import TrackSearch from './TrackSearch';

export interface DeckEQ {
  low: number;
  mid: number;
  high: number;
}

interface DeckProps {
  side: 'A' | 'B';
  accent: string;
  eq: DeckEQ;
  onEQChange: (eq: DeckEQ) => void;
  volume: number;
  onVolume: (v: number) => void;
  masterFade: number; // combined crossfade * master from parent
  onDeckSourceChange: (source: DeckSource | null) => void;
  onOpenConfig: () => void;
}

type Tab = 'direct' | 'spotify' | 'apple';

const TABS: { key: Tab; label: string; color: string; kind: SourceKind }[] = [
  { key: 'direct', label: 'URL · Suno · Bandcamp', color: '#c084fc', kind: 'direct' },
  { key: 'spotify', label: 'Spotify', color: '#1ed760', kind: 'spotify' },
  { key: 'apple', label: 'Apple Music', color: '#fb7185', kind: 'apple' },
];

export default function Deck({
  side,
  accent,
  eq,
  onEQChange,
  volume,
  onVolume,
  masterFade,
  onDeckSourceChange,
  onOpenConfig,
}: DeckProps) {
  const [tab, setTab] = useState<Tab>('direct');
  const [source, setSource] = useState<DeckSource | null>(null);
  const [state, setState] = useState<DeckSourceState | null>(null);
  const [urlInput, setUrlInput] = useState('');

  // Construct the source when tab changes
  useEffect(() => {
    let disposed = false;
    let nextSource: DeckSource | null = null;
    try {
      if (tab === 'direct') {
        nextSource = new DirectAudioSource();
      } else if (tab === 'spotify') {
        if (!getStoredToken()) {
          // still create the source — it'll surface the "not signed in" error
          nextSource = new SpotifySource(`YT DJ Deck ${side}`);
        } else {
          nextSource = new SpotifySource(`YT DJ Deck ${side}`);
        }
      } else if (tab === 'apple') {
        if (!getDeveloperToken()) {
          setState({
            kind: 'apple',
            track: null,
            isReady: false,
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            error: 'Add your Apple Music developer token in Connections first.',
          });
          return;
        }
        nextSource = new AppleMusicSource();
      }
    } catch (err) {
      setState({
        kind: tab,
        track: null,
        isReady: false,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        error: String((err as Error).message ?? err),
      });
    }

    if (!nextSource) return;
    setSource(nextSource);
    onDeckSourceChange(nextSource);
    const unsub = nextSource.subscribe((s) => {
      if (!disposed) setState(s);
    });
    return () => {
      disposed = true;
      unsub();
      nextSource?.dispose();
      onDeckSourceChange(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, side]);

  // Apply EQ + volume to the live source
  useEffect(() => {
    source?.setEQ(eq);
  }, [source, eq]);
  useEffect(() => {
    source?.setVolume(volume * masterFade);
  }, [source, volume, masterFade]);

  const submitUrl = () => {
    if (!urlInput.trim() || !source || tab !== 'direct') return;
    (source as DirectAudioSource).load(urlInput.trim());
  };

  const supportsRealEQ = useMemo(() => source?.supportsWebAudioEQ ?? false, [source]);

  return (
    <div
      className="panel p-3 sm:p-4 flex flex-col gap-3"
      style={{ boxShadow: `0 0 40px -24px ${accent}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="font-display text-xl sm:text-2xl tracking-widest"
            style={{ color: accent, textShadow: `0 0 12px ${accent}` }}
          >
            DECK {side}
          </span>
          <span className={`led ${state?.isPlaying ? 'on-green' : ''}`} />
        </div>
        <span className="pill">
          {supportsRealEQ ? 'Real EQ' : 'EQ = volume kill'}
        </span>
      </div>

      {/* Source tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-black/40 border border-white/5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 px-2 py-1.5 rounded text-[10px] sm:text-[11px] font-bold uppercase tracking-widest transition-colors"
            style={{
              background:
                tab === t.key
                  ? `linear-gradient(180deg, ${t.color}33, ${t.color}11)`
                  : 'transparent',
              color: tab === t.key ? t.color : 'rgba(255,255,255,0.6)',
              boxShadow: tab === t.key ? `0 0 12px -6px ${t.color}` : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Source input */}
      {tab === 'direct' ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitUrl();
          }}
        >
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste MP3 / M4A / OGG URL"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-[16px] placeholder-white/30 focus:outline-none focus:border-white/30 font-mono"
          />
          <button type="submit" className="neon-btn shrink-0" style={{ color: accent }}>
            Load
          </button>
        </form>
      ) : tab === 'spotify' ? (
        state?.error && !getStoredToken() ? (
          <button onClick={onOpenConfig} className="neon-btn" style={{ color: '#1ed760' }}>
            Connect Spotify in settings →
          </button>
        ) : (
          <TrackSearch
            backend="spotify"
            accent={accent}
            onPick={(r) => {
              const spot = source as SpotifySource;
              if ('uri' in r) spot.loadTrack(r.uri, r);
            }}
          />
        )
      ) : state?.error && !getDeveloperToken() ? (
        <button onClick={onOpenConfig} className="neon-btn" style={{ color: '#fb7185' }}>
          Set up Apple Music in settings →
        </button>
      ) : (
        <TrackSearch
          backend="apple"
          accent={accent}
          onPick={(r) => {
            const apple = source as AppleMusicSource;
            if ('songId' in r) void apple.loadSongId(r.songId, r);
          }}
        />
      )}

      {/* Error */}
      {state?.error && (
        <div className="text-[11px] font-mono text-red-300 bg-red-500/10 rounded px-2 py-1 border border-red-500/20">
          {state.error}
        </div>
      )}

      {/* Title + artist */}
      <div className="text-xs font-mono text-white/70 h-8 leading-tight overflow-hidden">
        <div className="truncate">{state?.track?.title ?? '—'}</div>
        <div className="truncate text-white/40">{state?.track?.artist ?? ''}</div>
      </div>

      {/* Turntable */}
      <div className="flex items-center justify-center py-1">
        <Turntable
          videoId={state?.track?.artworkUrl ? `url:${state.track.artworkUrl}` : null}
          spinning={!!state?.isPlaying}
          accent={accent}
          side={side}
          artworkUrl={state?.track?.artworkUrl}
        />
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-2 text-[10px] font-mono text-white/60">
        <span className="tabular-nums w-8">{formatTime(state?.currentTime ?? 0)}</span>
        <input
          type="range"
          min={0}
          max={Math.max(1, state?.duration ?? 1)}
          step={0.1}
          value={state?.currentTime ?? 0}
          onChange={(e) => source?.seekTo(Number(e.target.value))}
          className="slider-x flex-1"
          disabled={!state?.isReady || !state?.track}
          aria-label="Seek"
        />
        <span className="tabular-nums w-8 text-right">{formatTime(state?.duration ?? 0)}</span>
      </div>

      {/* Transport */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => void source?.toggle()}
          className="neon-btn flex-1 py-3"
          style={{ color: accent, boxShadow: `0 0 14px -5px ${accent}` }}
          disabled={!state?.track}
        >
          {state?.isPlaying ? '▐▐ Pause' : '▶ Play'}
        </button>
        <button
          onClick={() => {
            source?.seekTo(0);
            source?.pause();
          }}
          className="neon-btn py-3 px-4"
          disabled={!state?.track}
        >
          ⟲ Cue
        </button>
      </div>

      {/* EQ */}
      <div className="panel-inset p-3 flex items-center justify-around gap-2">
        <Knob
          label="LOW"
          hint="200Hz"
          color="#f472b6"
          value={eq.low}
          onChange={(v) => onEQChange({ ...eq, low: v })}
          bipolar
          onDoubleClick={() => onEQChange({ ...eq, low: 0.5 })}
          size={64}
        />
        <Knob
          label="MID"
          hint="1kHz"
          color="#fcd34d"
          value={eq.mid}
          onChange={(v) => onEQChange({ ...eq, mid: v })}
          bipolar
          onDoubleClick={() => onEQChange({ ...eq, mid: 0.5 })}
          size={64}
        />
        <Knob
          label="HIGH"
          hint="5kHz"
          color="#67e8f9"
          value={eq.high}
          onChange={(v) => onEQChange({ ...eq, high: v })}
          bipolar
          onDoubleClick={() => onEQChange({ ...eq, high: 0.5 })}
          size={64}
        />
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2">
        <span className="label-cap w-14 shrink-0">Vol</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => onVolume(Number(e.target.value))}
          className="slider-x flex-1"
          aria-label="Deck volume"
        />
        <span className="pill tabular-nums w-10 justify-center">{Math.round(volume * 100)}</span>
      </div>
    </div>
  );
}
