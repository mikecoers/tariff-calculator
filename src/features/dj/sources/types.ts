export type SourceKind = 'direct' | 'spotify' | 'apple';

export interface TrackInfo {
  id: string;
  title: string;
  artist?: string;
  artworkUrl?: string;
  durationSeconds?: number;
  source: SourceKind;
}

export interface DeckSourceState {
  kind: SourceKind;
  track: TrackInfo | null;
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
}

/**
 * Unified control surface for every deck playback backend.
 * Concrete implementations are in ./DirectAudioSource, ./SpotifySource, ./AppleMusicSource.
 *
 * Not every backend supports everything:
 *   - direct audio: full Web Audio graph, real EQ, seekTo ok
 *   - spotify:    volume only, seek ok, no Web Audio routing (DRM)
 *   - apple music: volume only, seek ok, no Web Audio routing (DRM)
 *
 * The `supportsWebAudioEQ` flag tells the UI whether the EQ knobs apply as real
 * biquad filters (true) or as approximate volume attenuation (false).
 */
export interface DeckSource {
  readonly kind: SourceKind;
  readonly supportsWebAudioEQ: boolean;

  subscribe(listener: (state: DeckSourceState) => void): () => void;
  getState(): DeckSourceState;

  play(): void | Promise<void>;
  pause(): void | Promise<void>;
  toggle(): void | Promise<void>;
  seekTo(seconds: number): void | Promise<void>;

  /** 0..1 — absolute volume for this source (crossfade + deck + master combined by caller). */
  setVolume(volume: number): void;

  /**
   * Apply the UI EQ knobs. Each knob is 0..1, 0.5 = neutral.
   * Implementations that support real Web Audio EQ translate to biquad gains;
   * others attenuate the output volume.
   */
  setEQ(eq: { low: number; mid: number; high: number }): void;

  /** Quick seek+play burst used by MPC "slice" pads. */
  stutter(seconds: number, durationMs: number): void;

  /** Free any resources (player, audio nodes, listeners). */
  dispose(): void;
}
