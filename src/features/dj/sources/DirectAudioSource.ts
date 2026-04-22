import type { DeckSource, DeckSourceState, TrackInfo } from './types';
import { createEQChain, ensureRunning, getAudioContext, getMasterGain } from './audioGraph';

/**
 * Suno, Bandcamp, and any other direct-audio URL. Uses an <audio> element
 * routed through a Web Audio graph:
 *
 *    <audio> -> MediaElementSource -> 3-band EQ -> gain -> masterGain -> destination
 *
 * Because the audio never hits DRM, EQ is REAL — the knobs drive BiquadFilterNodes.
 */
export class DirectAudioSource implements DeckSource {
  readonly kind = 'direct' as const;
  readonly supportsWebAudioEQ = true;

  private audio: HTMLAudioElement;
  private mediaNode: MediaElementAudioSourceNode | null = null;
  private eq: ReturnType<typeof createEQChain>;
  private gainNode: GainNode;
  private listeners = new Set<(s: DeckSourceState) => void>();
  private state: DeckSourceState = {
    kind: 'direct',
    track: null,
    isReady: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    error: null,
  };
  private pollId: number | null = null;
  private stutterTimer: number | null = null;

  constructor() {
    const ctx = getAudioContext();
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';

    this.eq = createEQChain(ctx);
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 1;
    this.eq.output.connect(this.gainNode);
    this.gainNode.connect(getMasterGain());

    this.audio.addEventListener('loadedmetadata', () => {
      this.update({
        duration: this.audio.duration || 0,
        isReady: true,
        error: null,
      });
    });
    this.audio.addEventListener('play', () => this.update({ isPlaying: true }));
    this.audio.addEventListener('pause', () => this.update({ isPlaying: false }));
    this.audio.addEventListener('ended', () => this.update({ isPlaying: false }));
    this.audio.addEventListener('error', () =>
      this.update({
        error:
          'Could not load this audio URL — it may be blocked by CORS, require auth, or not be a direct media file.',
        isReady: false,
      })
    );

    this.pollId = window.setInterval(() => {
      if (!this.audio.src) return;
      this.update({
        currentTime: this.audio.currentTime || 0,
        duration: this.audio.duration || this.state.duration,
      });
    }, 250);
  }

  private ensureMediaSource() {
    if (this.mediaNode) return;
    const ctx = getAudioContext();
    try {
      this.mediaNode = ctx.createMediaElementSource(this.audio);
      this.mediaNode.connect(this.eq.input);
    } catch (err) {
      // createMediaElementSource can only be called once per element — ignore.
      console.warn('DirectAudio source node already exists', err);
    }
  }

  load(url: string, info?: Partial<TrackInfo>) {
    this.ensureMediaSource();
    try {
      this.audio.src = url;
      const track: TrackInfo = {
        id: info?.id ?? url,
        title: info?.title ?? guessTitleFromUrl(url),
        artist: info?.artist,
        artworkUrl: info?.artworkUrl,
        source: 'direct',
      };
      this.update({ track, isReady: false, error: null, currentTime: 0 });
    } catch (err) {
      this.update({ error: String(err) });
    }
  }

  async play() {
    await ensureRunning();
    this.ensureMediaSource();
    try {
      await this.audio.play();
    } catch (err) {
      this.update({ error: `Playback blocked: ${String((err as Error).message || err)}` });
    }
  }
  pause() {
    this.audio.pause();
  }
  async toggle() {
    if (this.audio.paused) await this.play();
    else this.pause();
  }
  seekTo(seconds: number) {
    try {
      this.audio.currentTime = Math.max(0, Math.min(this.audio.duration || 1e9, seconds));
    } catch {
      // ignore
    }
  }
  setVolume(v: number) {
    const clamped = Math.max(0, Math.min(1.2, v));
    this.gainNode.gain.setTargetAtTime(clamped, this.gainNode.context.currentTime, 0.015);
  }
  setEQ(eq: { low: number; mid: number; high: number }) {
    this.eq.setEQ(eq);
  }
  stutter(seconds: number, durationMs: number) {
    this.seekTo(seconds);
    void this.play();
    if (this.stutterTimer) window.clearTimeout(this.stutterTimer);
    this.stutterTimer = window.setTimeout(() => this.pause(), durationMs);
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
    if (this.stutterTimer) window.clearTimeout(this.stutterTimer);
    this.audio.pause();
    this.audio.src = '';
    try {
      this.mediaNode?.disconnect();
    } catch {}
    this.eq.input.disconnect();
    this.eq.output.disconnect();
    this.gainNode.disconnect();
    this.listeners.clear();
  }
}

function guessTitleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const tail = u.pathname.split('/').filter(Boolean).pop() || url;
    return decodeURIComponent(tail).replace(/\.[a-z0-9]+$/i, '');
  } catch {
    return url;
  }
}
