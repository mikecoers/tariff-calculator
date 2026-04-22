import type { DeckSource, DeckSourceState, TrackInfo } from './types';

declare global {
  interface Window {
    MusicKit?: {
      configure: (opts: {
        developerToken: string;
        app: { name: string; build: string };
      }) => Promise<unknown>;
      getInstance: () => MusicKitInstance;
    };
    __musicKitPromise?: Promise<void>;
  }
}

interface MusicKitInstance {
  authorize: () => Promise<string>;
  unauthorize: () => Promise<void>;
  isAuthorized: boolean;
  addEventListener: (name: string, cb: (data: unknown) => void) => void;
  removeEventListener: (name: string, cb: (data: unknown) => void) => void;
  setQueue: (opts: { songs?: string[]; song?: string }) => Promise<unknown>;
  play: () => Promise<unknown>;
  pause: () => void;
  stop: () => void;
  seekToTime: (seconds: number) => Promise<unknown>;
  volume: number;
  currentPlaybackTime: number;
  currentPlaybackDuration: number;
  isPlaying: boolean;
  nowPlayingItem: {
    id: string;
    title: string;
    artistName?: string;
    albumName?: string;
    artworkURL?: string;
    playbackDuration?: number;
    attributes?: {
      name: string;
      artistName?: string;
      albumName?: string;
      artwork?: { url?: string };
      durationInMillis?: number;
    };
  } | null;
  api: {
    search: (
      term: string,
      opts: { types: string; limit?: number }
    ) => Promise<{
      songs?: {
        data: {
          id: string;
          attributes: {
            name: string;
            artistName: string;
            albumName: string;
            artwork?: { url: string };
            durationInMillis: number;
          };
        }[];
      };
    }>;
  };
}

const LS_PREFIX = 'djmix.apple';
const LS_DEV_TOKEN = `${LS_PREFIX}.developerToken`;

export function getDeveloperToken(): string | null {
  return localStorage.getItem(LS_DEV_TOKEN);
}
export function setDeveloperToken(tok: string) {
  localStorage.setItem(LS_DEV_TOKEN, tok.trim());
}
export function clearDeveloperToken() {
  localStorage.removeItem(LS_DEV_TOKEN);
}

function loadMusicKit(): Promise<void> {
  if (window.__musicKitPromise) return window.__musicKitPromise;
  window.__musicKitPromise = new Promise<void>((resolve, reject) => {
    if (window.MusicKit) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
    s.async = true;
    s.onload = () => {
      // MusicKit dispatches 'musickitloaded' on document
      if (window.MusicKit) resolve();
      else {
        const handler = () => {
          document.removeEventListener('musickitloaded', handler);
          resolve();
        };
        document.addEventListener('musickitloaded', handler);
      }
    };
    s.onerror = () => reject(new Error('Failed to load MusicKit JS'));
    document.head.appendChild(s);
  });
  return window.__musicKitPromise;
}

let configuredInstance: MusicKitInstance | null = null;

export async function ensureMusicKit(): Promise<MusicKitInstance> {
  const token = getDeveloperToken();
  if (!token) throw new Error('Apple Music developer token missing');
  await loadMusicKit();
  if (!configuredInstance) {
    if (!window.MusicKit) throw new Error('MusicKit global not available');
    await window.MusicKit.configure({
      developerToken: token,
      app: { name: 'YT DJ Mix Lab', build: '0.1.0' },
    });
    configuredInstance = window.MusicKit.getInstance();
  }
  return configuredInstance;
}

export async function authorizeAppleMusic(): Promise<string> {
  const inst = await ensureMusicKit();
  return inst.authorize();
}

export async function unauthorizeAppleMusic(): Promise<void> {
  const inst = await ensureMusicKit();
  await inst.unauthorize();
}

export class AppleMusicSource implements DeckSource {
  readonly kind = 'apple' as const;
  readonly supportsWebAudioEQ = false;

  private music: MusicKitInstance | null = null;
  private listeners = new Set<(s: DeckSourceState) => void>();
  private state: DeckSourceState = {
    kind: 'apple',
    track: null,
    isReady: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    error: null,
  };
  private pollId: number | null = null;
  private volume = 1;
  private eqAttenuation = 1;
  private pendingSongId: string | null = null;

  constructor() {
    void this.init();
  }

  private async init() {
    try {
      this.music = await ensureMusicKit();
      if (!this.music.isAuthorized) {
        this.update({
          error: 'Not signed in to Apple Music. Open settings and authorize.',
        });
        return;
      }
      this.update({ isReady: true, error: null });

      this.pollId = window.setInterval(() => {
        if (!this.music) return;
        const now = this.music.nowPlayingItem;
        const attrs = now?.attributes;
        const durationSec = attrs?.durationInMillis
          ? attrs.durationInMillis / 1000
          : now?.playbackDuration ?? this.state.duration;
        const track: TrackInfo | null = now
          ? {
              id: now.id,
              title: attrs?.name ?? now.title,
              artist: attrs?.artistName ?? now.artistName,
              artworkUrl:
                attrs?.artwork?.url?.replace('{w}', '300').replace('{h}', '300') ||
                now.artworkURL,
              durationSeconds: durationSec,
              source: 'apple',
            }
          : null;
        this.update({
          isPlaying: !!this.music.isPlaying,
          currentTime: this.music.currentPlaybackTime || 0,
          duration: this.music.currentPlaybackDuration || durationSec || 0,
          track,
        });
      }, 500);

      if (this.pendingSongId) {
        const id = this.pendingSongId;
        this.pendingSongId = null;
        await this.loadSongId(id);
      }
    } catch (err) {
      this.update({ error: String((err as Error).message ?? err) });
    }
  }

  async loadSongId(songId: string, info?: Partial<TrackInfo>) {
    if (!this.music) {
      this.pendingSongId = songId;
      return;
    }
    if (info) {
      this.update({
        track: {
          id: info.id ?? songId,
          title: info.title ?? songId,
          artist: info.artist,
          artworkUrl: info.artworkUrl,
          source: 'apple',
        },
      });
    }
    try {
      await this.music.setQueue({ song: songId });
      await this.music.play();
      this.update({ error: null });
    } catch (err) {
      this.update({ error: `Apple Music load failed: ${String((err as Error).message ?? err)}` });
    }
  }

  async play() {
    await this.music?.play();
  }
  pause() {
    this.music?.pause();
  }
  async toggle() {
    if (!this.music) return;
    if (this.music.isPlaying) this.music.pause();
    else await this.music.play();
  }
  async seekTo(seconds: number) {
    await this.music?.seekToTime(Math.max(0, seconds));
  }
  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    this.applyVolume();
  }
  setEQ(eq: { low: number; mid: number; high: number }) {
    const band = (x: number) => (x <= 0.5 ? x * 2 : 1 + (x - 0.5) * 0.4);
    this.eqAttenuation = Math.max(
      0,
      Math.min(1.2, (band(eq.low) + band(eq.mid) + band(eq.high)) / 3)
    );
    this.applyVolume();
  }
  private applyVolume() {
    if (!this.music) return;
    this.music.volume = Math.max(0, Math.min(1, this.volume * this.eqAttenuation));
  }
  stutter(seconds: number, durationMs: number) {
    void this.seekTo(seconds);
    void this.play();
    window.setTimeout(() => this.pause(), durationMs);
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
    this.listeners.clear();
  }
}

export interface AppleMusicSearchResult extends TrackInfo {
  songId: string;
}

export async function appleMusicSearch(query: string): Promise<AppleMusicSearchResult[]> {
  const inst = await ensureMusicKit();
  if (!inst.isAuthorized) throw new Error('Not signed in to Apple Music');
  const res = await inst.api.search(query, { types: 'songs', limit: 10 });
  const songs = res.songs?.data ?? [];
  return songs.map((s) => ({
    id: s.id,
    songId: s.id,
    title: s.attributes.name,
    artist: s.attributes.artistName,
    artworkUrl: s.attributes.artwork?.url?.replace('{w}', '300').replace('{h}', '300'),
    durationSeconds: s.attributes.durationInMillis / 1000,
    source: 'apple' as const,
  }));
}
