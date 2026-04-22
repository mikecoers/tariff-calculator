import type { DeckSource, DeckSourceState, TrackInfo } from './types';
import { clearToken, getValidAccessToken } from './spotifyAuth';

declare global {
  interface Window {
    Spotify?: {
      Player: new (opts: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
    __spotifySdkPromise?: Promise<void>;
  }
}

interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: string, cb: (data: unknown) => void): boolean;
  removeListener(event: string): boolean;
  getCurrentState(): Promise<SpotifyPlaybackState | null>;
  togglePlay(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
}

interface SpotifyPlaybackState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: {
      id: string;
      uri: string;
      name: string;
      artists: { name: string }[];
      album: { images: { url: string }[]; name: string };
      duration_ms: number;
    };
  };
}

function loadSpotifySDK(): Promise<void> {
  if (window.__spotifySdkPromise) return window.__spotifySdkPromise;
  window.__spotifySdkPromise = new Promise<void>((resolve) => {
    if (window.Spotify?.Player) {
      resolve();
      return;
    }
    const prev = window.onSpotifyWebPlaybackSDKReady;
    window.onSpotifyWebPlaybackSDKReady = () => {
      if (prev) prev();
      resolve();
    };
    const s = document.createElement('script');
    s.src = 'https://sdk.scdn.co/spotify-player.js';
    s.async = true;
    document.head.appendChild(s);
  });
  return window.__spotifySdkPromise;
}

/**
 * Spotify Web Playback SDK-backed deck.
 *
 * Requirements at runtime:
 *   - User has Spotify **Premium**
 *   - A valid access token (OAuth PKCE, see spotifyAuth.ts)
 *
 * DRM means we cannot route this through Web Audio API — EQ knobs attenuate
 * output volume instead of filtering. The deck UI signals this to the user.
 */
export class SpotifySource implements DeckSource {
  readonly kind = 'spotify' as const;
  readonly supportsWebAudioEQ = false;

  private player: SpotifyPlayer | null = null;
  private deviceId: string | null = null;
  private listeners = new Set<(s: DeckSourceState) => void>();
  private state: DeckSourceState = {
    kind: 'spotify',
    track: null,
    isReady: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    error: null,
  };
  private pollId: number | null = null;
  private pendingUri: string | null = null;
  private volume = 1;
  private eqAttenuation = 1;

  constructor(private deckName: string) {
    void this.init();
  }

  private async init() {
    try {
      const token = await getValidAccessToken();
      if (!token) {
        this.update({
          error: 'Not signed in to Spotify. Open settings and connect Spotify first.',
        });
        return;
      }
      await loadSpotifySDK();
      if (!window.Spotify) throw new Error('Spotify SDK failed to load');
      this.player = new window.Spotify.Player({
        name: this.deckName,
        getOAuthToken: (cb) => {
          void getValidAccessToken().then((t) => t && cb(t));
        },
        volume: 1,
      });

      this.player.addListener('ready', (data) => {
        const { device_id } = data as { device_id: string };
        this.deviceId = device_id;
        this.update({ isReady: true, error: null });
        if (this.pendingUri) {
          const uri = this.pendingUri;
          this.pendingUri = null;
          void this.playUri(uri);
        }
      });
      this.player.addListener('not_ready', () => {
        this.update({ isReady: false });
      });
      this.player.addListener('player_state_changed', (data) => {
        const s = data as SpotifyPlaybackState | null;
        if (!s) return;
        const t = s.track_window.current_track;
        const track: TrackInfo = {
          id: t.id,
          title: t.name,
          artist: t.artists.map((a) => a.name).join(', '),
          artworkUrl: t.album.images[0]?.url,
          durationSeconds: t.duration_ms / 1000,
          source: 'spotify',
        };
        this.update({
          track,
          isPlaying: !s.paused,
          currentTime: s.position / 1000,
          duration: s.duration / 1000,
        });
      });
      this.player.addListener('authentication_error', (err) => {
        clearToken();
        this.update({
          error: `Spotify auth error: ${(err as { message?: string }).message ?? 'sign in again'}`,
        });
      });
      this.player.addListener('initialization_error', (err) => {
        this.update({
          error: `Spotify init error: ${(err as { message?: string }).message ?? 'unknown'}`,
        });
      });
      this.player.addListener('account_error', () => {
        this.update({ error: 'Spotify Premium is required for in-app playback.' });
      });

      const ok = await this.player.connect();
      if (!ok) {
        this.update({ error: 'Could not connect to Spotify player' });
      }
      this.pollId = window.setInterval(() => {
        void this.player?.getCurrentState().then((s) => {
          if (!s) return;
          this.update({
            isPlaying: !s.paused,
            currentTime: s.position / 1000,
            duration: s.duration / 1000,
          });
        });
      }, 500);
    } catch (err) {
      this.update({ error: String((err as Error).message ?? err) });
    }
  }

  private async playUri(uri: string) {
    const token = await getValidAccessToken();
    if (!token || !this.deviceId) {
      this.pendingUri = uri;
      return;
    }
    try {
      const resp = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(this.deviceId)}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uris: [uri] }),
        }
      );
      if (!resp.ok && resp.status !== 204) {
        const text = await resp.text();
        this.update({ error: `Spotify play failed: ${resp.status} ${text}` });
      } else {
        this.update({ error: null });
      }
    } catch (err) {
      this.update({ error: String((err as Error).message ?? err) });
    }
  }

  loadTrack(spotifyUri: string, info?: Partial<TrackInfo>) {
    // optimistic track info, replaced by player_state_changed when playback starts
    if (info) {
      this.update({
        track: {
          id: info.id ?? spotifyUri,
          title: info.title ?? spotifyUri,
          artist: info.artist,
          artworkUrl: info.artworkUrl,
          source: 'spotify',
        },
      });
    }
    void this.playUri(spotifyUri);
  }

  async play() {
    await this.player?.resume();
  }
  async pause() {
    await this.player?.pause();
  }
  async toggle() {
    await this.player?.togglePlay();
  }
  async seekTo(seconds: number) {
    await this.player?.seek(Math.max(0, seconds * 1000));
  }
  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    this.applyVolume();
  }
  setEQ(eq: { low: number; mid: number; high: number }) {
    // Volume-attenuation model when real filters are unavailable.
    const band = (x: number) => (x <= 0.5 ? x * 2 : 1 + (x - 0.5) * 0.4);
    this.eqAttenuation = Math.max(
      0,
      Math.min(1.2, (band(eq.low) + band(eq.mid) + band(eq.high)) / 3)
    );
    this.applyVolume();
  }
  private applyVolume() {
    void this.player?.setVolume(Math.max(0, Math.min(1, this.volume * this.eqAttenuation)));
  }
  stutter(seconds: number, durationMs: number) {
    void this.seekTo(seconds);
    void this.play();
    window.setTimeout(() => void this.pause(), durationMs);
  }

  subscribe(listener: (s: DeckSourceState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }
  getState() {
    return this.state;
  }
  private update(patch: Partial<DeckSourceState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l(this.state));
  }

  dispose() {
    if (this.pollId) window.clearInterval(this.pollId);
    try {
      this.player?.disconnect();
    } catch {}
    this.listeners.clear();
  }
}

export interface SpotifySearchResult extends TrackInfo {
  uri: string;
}

export async function spotifySearch(query: string): Promise<SpotifySearchResult[]> {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Not signed in to Spotify');
  const resp = await fetch(
    `https://api.spotify.com/v1/search?type=track&limit=10&q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!resp.ok) throw new Error(`Spotify search failed: ${resp.status}`);
  const data = (await resp.json()) as {
    tracks: {
      items: {
        id: string;
        uri: string;
        name: string;
        duration_ms: number;
        artists: { name: string }[];
        album: { images: { url: string }[] };
      }[];
    };
  };
  return data.tracks.items.map((t) => ({
    id: t.id,
    uri: t.uri,
    title: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    artworkUrl: t.album.images?.[0]?.url,
    durationSeconds: t.duration_ms / 1000,
    source: 'spotify' as const,
  }));
}
