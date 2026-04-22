import { useEffect, useState } from 'react';
import {
  getClientId,
  setClientId,
  clearClientId,
  getStoredToken,
  clearToken,
  startAuth,
  getRedirectUri,
} from '../sources/spotifyAuth';
import {
  getDeveloperToken,
  setDeveloperToken,
  clearDeveloperToken,
  authorizeAppleMusic,
  unauthorizeAppleMusic,
  ensureMusicKit,
} from '../sources/AppleMusicSource';

interface ConfigModalProps {
  open: boolean;
  onClose: () => void;
  onStatusChange: () => void;
}

export default function ConfigModal({ open, onClose, onStatusChange }: ConfigModalProps) {
  const [spotifyClientId, setSpotifyClientIdState] = useState('');
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [appleToken, setAppleTokenState] = useState('');
  const [appleConnected, setAppleConnected] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSpotifyClientIdState(getClientId() ?? '');
    setSpotifyConnected(!!getStoredToken());
    setAppleTokenState(getDeveloperToken() ?? '');
    (async () => {
      try {
        if (getDeveloperToken()) {
          const inst = await ensureMusicKit();
          setAppleConnected(!!inst.isAuthorized);
        } else {
          setAppleConnected(false);
        }
      } catch {
        setAppleConnected(false);
      }
    })();
  }, [open]);

  if (!open) return null;

  const saveSpotifyClientId = () => {
    if (!spotifyClientId.trim()) {
      clearClientId();
      clearToken();
      setSpotifyConnected(false);
      onStatusChange();
      return;
    }
    setClientId(spotifyClientId);
    setStatus('Spotify Client ID saved. Click Connect to sign in.');
  };
  const connectSpotify = async () => {
    if (!getClientId()) {
      setStatus('Paste a Spotify Client ID first.');
      return;
    }
    await startAuth(getClientId()!);
  };
  const disconnectSpotify = () => {
    clearToken();
    setSpotifyConnected(false);
    onStatusChange();
    setStatus('Spotify session cleared.');
  };

  const saveAppleToken = () => {
    if (!appleToken.trim()) {
      clearDeveloperToken();
      setAppleConnected(false);
      onStatusChange();
      return;
    }
    setDeveloperToken(appleToken);
    setStatus('Apple Music developer token saved. Click Authorize to sign in.');
  };
  const connectApple = async () => {
    try {
      setStatus('Opening Apple Music sign-in…');
      await authorizeAppleMusic();
      setAppleConnected(true);
      onStatusChange();
      setStatus('Apple Music authorized.');
    } catch (err) {
      setStatus(`Apple Music sign-in failed: ${String((err as Error).message ?? err)}`);
    }
  };
  const disconnectApple = async () => {
    try {
      await unauthorizeAppleMusic();
    } catch {}
    setAppleConnected(false);
    onStatusChange();
    setStatus('Apple Music session cleared.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur" onClick={onClose} />
      <div className="relative panel w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl sm:text-2xl tracking-[0.2em] text-white/90">
            CONNECTIONS
          </h2>
          <button onClick={onClose} className="neon-btn">
            ✕ Close
          </button>
        </div>

        {status && (
          <div className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs font-mono text-white/70">
            {status}
          </div>
        )}

        {/* Spotify */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base tracking-[0.2em]" style={{ color: '#1ed760' }}>
              SPOTIFY
            </h3>
            <span className={`pill ${spotifyConnected ? 'on-green' : ''}`}>
              <span className={`led ${spotifyConnected ? 'on-green' : ''}`} />
              {spotifyConnected ? 'connected' : 'not connected'}
            </span>
          </div>
          <p className="text-[11px] font-mono text-white/50 leading-relaxed">
            Requires a Spotify Developer app + Premium account. Create an app at{' '}
            <a
              className="underline"
              href="https://developer.spotify.com/dashboard"
              target="_blank"
              rel="noreferrer"
            >
              developer.spotify.com/dashboard
            </a>{' '}
            and add this site as a redirect URI:
          </p>
          <code className="text-[11px] font-mono bg-black/60 border border-white/10 rounded px-2 py-1 break-all">
            {getRedirectUri()}
          </code>
          <div className="flex gap-2">
            <input
              value={spotifyClientId}
              onChange={(e) => setSpotifyClientIdState(e.target.value)}
              placeholder="Spotify Client ID"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-[16px] font-mono placeholder-white/30 focus:outline-none focus:border-white/30"
            />
            <button onClick={saveSpotifyClientId} className="neon-btn shrink-0">
              Save
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={connectSpotify}
              className="neon-btn flex-1"
              style={{ color: '#1ed760', boxShadow: '0 0 18px -6px #1ed760' }}
            >
              Connect Spotify
            </button>
            <button onClick={disconnectSpotify} className="neon-btn">
              Sign out
            </button>
          </div>
        </section>

        {/* Apple Music */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base tracking-[0.2em]" style={{ color: '#fb7185' }}>
              APPLE MUSIC
            </h3>
            <span className={`pill ${appleConnected ? 'on-green' : ''}`}>
              <span className={`led ${appleConnected ? 'on-green' : ''}`} />
              {appleConnected ? 'authorized' : 'not authorized'}
            </span>
          </div>
          <p className="text-[11px] font-mono text-white/50 leading-relaxed">
            Requires a MusicKit Developer Token (signed JWT from an Apple Developer account) and an
            Apple Music subscription. Generate a token at{' '}
            <a
              className="underline"
              href="https://developer.apple.com/documentation/applemusicapi/getting-keys-and-creating-tokens"
              target="_blank"
              rel="noreferrer"
            >
              developer.apple.com
            </a>
            .
          </p>
          <textarea
            value={appleToken}
            onChange={(e) => setAppleTokenState(e.target.value)}
            placeholder="Paste MusicKit developer token (JWT)"
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-[14px] font-mono placeholder-white/30 focus:outline-none focus:border-white/30"
          />
          <div className="flex gap-2">
            <button onClick={saveAppleToken} className="neon-btn">
              Save
            </button>
            <button
              onClick={connectApple}
              className="neon-btn flex-1"
              style={{ color: '#fb7185', boxShadow: '0 0 18px -6px #fb7185' }}
            >
              Authorize Apple Music
            </button>
            <button onClick={disconnectApple} className="neon-btn">
              Sign out
            </button>
          </div>
        </section>

        <section>
          <h3 className="font-display text-base tracking-[0.2em] text-white/80 mb-1">
            SUNO · BANDCAMP · DIRECT AUDIO
          </h3>
          <p className="text-[11px] font-mono text-white/50 leading-relaxed">
            No login — paste a direct MP3/M4A/OGG URL on either deck. For Suno, export your song
            and use its public audio link. For Bandcamp, use an artist-provided stream URL or a
            purchased-download link. Because direct audio isn't DRM-locked, the EQ knobs on these
            decks drive <em>real</em> 3-band Web Audio biquad filters.
          </p>
        </section>
      </div>
    </div>
  );
}
