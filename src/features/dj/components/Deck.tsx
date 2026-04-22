import { useState } from 'react';
import type { DeckController } from '../hooks/useYouTubePlayer';
import { formatTime, parseYouTubeId, ALLOWED_RATES } from '../utils/youtube';
import Turntable from './Turntable';
import Knob from './Knob';

export interface DeckEQ {
  low: number; // 0..1, 0.5 = neutral
  mid: number;
  high: number;
}

interface DeckProps {
  side: 'A' | 'B';
  accent: string;
  controller: DeckController;
  eq: DeckEQ;
  onEQChange: (eq: DeckEQ) => void;
  volume: number; // 0..1
  onVolume: (v: number) => void;
  onStutter?: (pos: number) => void; // for MPC binding indicator
}

export default function Deck({
  side,
  accent,
  controller,
  eq,
  onEQChange,
  volume,
  onVolume,
}: DeckProps) {
  const [input, setInput] = useState('');
  const { state, load, toggle, cue, setRate, seekTo } = controller;

  const submitLoad = () => {
    const id = parseYouTubeId(input);
    if (id) load(id);
  };

  const rateIdx = ALLOWED_RATES.indexOf(state.rate as (typeof ALLOWED_RATES)[number]);

  return (
    <div className="panel p-4 flex flex-col gap-3" style={{ boxShadow: `0 0 40px -24px ${accent}` }}>
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="font-display text-2xl tracking-widest"
            style={{ color: accent, textShadow: `0 0 12px ${accent}` }}
          >
            DECK {side}
          </span>
          <span className={`led ${state.isPlaying ? 'on-green' : ''}`} />
        </div>
        <span className="pill">{state.rate.toFixed(2)}x</span>
      </div>

      {/* URL input */}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submitLoad();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste YouTube URL or video ID"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-sm placeholder-white/30 focus:outline-none focus:border-white/30 font-mono"
        />
        <button type="submit" className="neon-btn neon-btn-cyan" style={{ color: accent }}>
          Load
        </button>
      </form>

      {/* title */}
      <div className="text-xs font-mono text-white/70 truncate h-4" title={state.title}>
        {state.title || (state.videoId ? `id:${state.videoId}` : '—')}
      </div>

      {/* turntable + hidden YT iframe mount */}
      <div className="flex items-center justify-center py-1">
        <Turntable videoId={state.videoId} spinning={state.isPlaying} accent={accent} side={side} />
      </div>
      <div
        ref={controller.mountRef}
        className="fixed left-[-9999px] top-0 w-[320px] h-[180px] overflow-hidden pointer-events-none"
        aria-hidden
      />

      {/* timeline */}
      <div className="flex items-center gap-2 text-[10px] font-mono text-white/60">
        <span>{formatTime(state.currentTime)}</span>
        <input
          type="range"
          min={0}
          max={Math.max(1, state.duration)}
          step={0.1}
          value={state.currentTime}
          onChange={(e) => seekTo(Number(e.target.value))}
          className="slider-x flex-1"
          disabled={!state.isReady || !state.videoId}
        />
        <span>{formatTime(state.duration)}</span>
      </div>

      {/* transport + tempo */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="neon-btn flex-1"
          style={{ color: accent, boxShadow: `0 0 14px -5px ${accent}` }}
          disabled={!state.videoId}
        >
          {state.isPlaying ? '▐▐ Pause' : '▶ Play'}
        </button>
        <button onClick={cue} className="neon-btn" disabled={!state.videoId}>
          ⟲ Cue
        </button>
      </div>

      {/* tempo select */}
      <div className="flex items-center gap-2">
        <span className="label-cap">Tempo</span>
        <input
          type="range"
          min={0}
          max={ALLOWED_RATES.length - 1}
          step={1}
          value={rateIdx === -1 ? 3 : rateIdx}
          onChange={(e) => setRate(ALLOWED_RATES[Number(e.target.value)])}
          className="slider-x flex-1"
          disabled={!state.isReady}
        />
      </div>

      {/* EQ + volume */}
      <div className="panel-inset p-3 flex items-center justify-between gap-2">
        <Knob
          label="LOW"
          hint="60Hz"
          color="#f472b6"
          value={eq.low}
          onChange={(v) => onEQChange({ ...eq, low: v })}
          bipolar
          onDoubleClick={() => onEQChange({ ...eq, low: 0.5 })}
          size={58}
        />
        <Knob
          label="MID"
          hint="1kHz"
          color="#fcd34d"
          value={eq.mid}
          onChange={(v) => onEQChange({ ...eq, mid: v })}
          bipolar
          onDoubleClick={() => onEQChange({ ...eq, mid: 0.5 })}
          size={58}
        />
        <Knob
          label="HIGH"
          hint="8kHz"
          color="#67e8f9"
          value={eq.high}
          onChange={(v) => onEQChange({ ...eq, high: v })}
          bipolar
          onDoubleClick={() => onEQChange({ ...eq, high: 0.5 })}
          size={58}
        />
        <div className="flex flex-col items-center gap-1">
          <div className="relative h-[110px] w-8 flex items-end justify-center panel-inset">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => onVolume(Number(e.target.value))}
              className="slider-y"
              style={{ writingMode: 'vertical-lr' as any, direction: 'rtl' }}
              aria-label="Deck volume"
            />
          </div>
          <div className="label-cap">Vol</div>
        </div>
      </div>
    </div>
  );
}
