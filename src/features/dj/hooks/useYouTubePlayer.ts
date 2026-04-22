import { useCallback, useEffect, useRef, useState } from 'react';
import { ALLOWED_RATES, nearestRate } from '../utils/youtube';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
    __ytApiLoaded?: boolean;
    __ytApiReadyPromise?: Promise<void>;
  }
}

function loadYTApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.__ytApiReadyPromise) return window.__ytApiReadyPromise;
  window.__ytApiReadyPromise = new Promise<void>((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      resolve();
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    document.head.appendChild(s);
  });
  return window.__ytApiReadyPromise;
}

export interface DeckState {
  videoId: string | null;
  title: string;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  isReady: boolean;
  rate: number;
}

export interface DeckController {
  state: DeckState;
  load: (videoId: string) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  cue: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (v: number) => void; // 0..1
  setRate: (rate: number) => void; // snapped to allowed
  stutter: (seconds: number, durationMs: number) => void;
  mountRef: React.RefObject<HTMLDivElement>;
}

export function useYouTubePlayer(elementId: string): DeckController {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const volRef = useRef(0.8);

  const [state, setState] = useState<DeckState>({
    videoId: null,
    title: '',
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    isReady: false,
    rate: 1,
  });

  // Initialize player
  useEffect(() => {
    let cancelled = false;
    loadYTApi().then(() => {
      if (cancelled || !mountRef.current) return;
      const inner = document.createElement('div');
      inner.id = elementId;
      mountRef.current.appendChild(inner);
      playerRef.current = new window.YT.Player(elementId, {
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: () => {
            try {
              playerRef.current.setVolume(Math.round(volRef.current * 100));
            } catch {}
            setState((s) => ({ ...s, isReady: true }));
          },
          onStateChange: (e: any) => {
            const PS = window.YT.PlayerState;
            setState((s) => ({
              ...s,
              isPlaying: e.data === PS.PLAYING,
              duration: playerRef.current?.getDuration?.() ?? s.duration,
            }));
          },
          onPlaybackRateChange: (e: any) => {
            setState((s) => ({ ...s, rate: e.data }));
          },
        },
      });
    });
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for time updates
  useEffect(() => {
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p || !p.getCurrentTime) return;
      try {
        const t = p.getCurrentTime();
        const d = p.getDuration();
        setState((s) =>
          s.currentTime === t && s.duration === d ? s : { ...s, currentTime: t, duration: d }
        );
      } catch {}
    }, 250);
    return () => clearInterval(id);
  }, []);

  const load = useCallback((videoId: string) => {
    const p = playerRef.current;
    if (!p || !p.loadVideoById) return;
    p.loadVideoById(videoId);
    // Pause immediately; autoplay is disabled in many contexts anyway
    setTimeout(() => {
      try {
        p.pauseVideo();
        const data = p.getVideoData?.();
        setState((s) => ({
          ...s,
          videoId,
          title: data?.title || '',
          duration: p.getDuration?.() || 0,
        }));
      } catch {}
    }, 300);
  }, []);

  const play = useCallback(() => playerRef.current?.playVideo?.(), []);
  const pause = useCallback(() => playerRef.current?.pauseVideo?.(), []);
  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    const PS = window.YT?.PlayerState;
    if (p.getPlayerState?.() === PS?.PLAYING) p.pauseVideo();
    else p.playVideo();
  }, []);
  const cue = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    p.seekTo(0, true);
    p.pauseVideo();
  }, []);
  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(Math.max(0, seconds), true);
  }, []);
  const setVolume = useCallback((v: number) => {
    volRef.current = Math.max(0, Math.min(1, v));
    try {
      playerRef.current?.setVolume?.(Math.round(volRef.current * 100));
    } catch {}
  }, []);
  const setRate = useCallback((rate: number) => {
    const snap = nearestRate(rate);
    try {
      playerRef.current?.setPlaybackRate?.(snap);
      setState((s) => ({ ...s, rate: snap }));
    } catch {}
  }, []);

  const stutter = useCallback((seconds: number, durationMs: number) => {
    const p = playerRef.current;
    if (!p) return;
    try {
      p.seekTo(Math.max(0, seconds), true);
      p.playVideo();
      window.setTimeout(() => {
        try {
          p.pauseVideo();
        } catch {}
      }, durationMs);
    } catch {}
  }, []);

  return { state, load, play, pause, toggle, cue, seekTo, setVolume, setRate, stutter, mountRef };
}

export { ALLOWED_RATES };
