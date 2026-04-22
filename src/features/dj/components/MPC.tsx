import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { playDrum, type DrumKind } from '../utils/drums';
import type { DeckController } from '../hooks/useYouTubePlayer';

// 16 pads, 4x4 grid.
// Rows:
//  0: kick, snare, clap, closedHat  (drums)
//  1: openHat, lowTom, highTom, rim (drums)
//  2: cowbell, crash, perc, zap     (perc)
//  3: chopA1, chopA2, chopB1, chopB2 (YouTube chops — bind by shift+click)
type PadKind = { type: 'drum'; kind: DrumKind } | { type: 'chop'; deck: 'A' | 'B'; slot: number };

const DEFAULT_PADS: PadKind[] = [
  { type: 'drum', kind: 'kick' },
  { type: 'drum', kind: 'snare' },
  { type: 'drum', kind: 'clap' },
  { type: 'drum', kind: 'closedHat' },
  { type: 'drum', kind: 'openHat' },
  { type: 'drum', kind: 'lowTom' },
  { type: 'drum', kind: 'highTom' },
  { type: 'drum', kind: 'rim' },
  { type: 'drum', kind: 'cowbell' },
  { type: 'drum', kind: 'crash' },
  { type: 'drum', kind: 'perc' },
  { type: 'drum', kind: 'zap' },
  { type: 'chop', deck: 'A', slot: 0 },
  { type: 'chop', deck: 'A', slot: 1 },
  { type: 'chop', deck: 'B', slot: 0 },
  { type: 'chop', deck: 'B', slot: 1 },
];

const PAD_LABELS: string[] = [
  'KICK', 'SNARE', 'CLAP', 'HH-C',
  'HH-O', 'TOM-L', 'TOM-H', 'RIM',
  'COWB', 'CRASH', 'PERC', 'ZAP',
  'CHOP A1', 'CHOP A2', 'CHOP B1', 'CHOP B2',
];

const PAD_KEYS: string[] = [
  '1', '2', '3', '4',
  'q', 'w', 'e', 'r',
  'a', 's', 'd', 'f',
  'z', 'x', 'c', 'v',
];

interface MPCProps {
  deckA: DeckController;
  deckB: DeckController;
  masterVolume: number;
}

type ChopBinding = { time: number; duration: number }; // duration in ms

export default function MPC({ deckA, deckB, masterVolume }: MPCProps) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const outGainRef = useRef<GainNode | null>(null);

  const [bpm, setBpm] = useState(96);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);
  // pattern[padIdx][stepIdx] = 0/1
  const [pattern, setPattern] = useState<number[][]>(() =>
    Array.from({ length: 16 }, () => Array(16).fill(0))
  );
  const [selectedPad, setSelectedPad] = useState(0);
  // chop bindings: 4 slots indexed by pad 12..15
  const [chops, setChops] = useState<Record<number, ChopBinding>>({});
  const [bindMode, setBindMode] = useState(false);
  const [flash, setFlash] = useState<number | null>(null);

  // Init audio context lazily
  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      const g = ctx.createGain();
      g.gain.value = masterVolume;
      g.connect(ctx.destination);
      audioCtxRef.current = ctx;
      outGainRef.current = g;
    }
    if (audioCtxRef.current?.state === 'suspended') {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current!;
  }, [masterVolume]);

  useEffect(() => {
    if (outGainRef.current) outGainRef.current.gain.value = masterVolume;
  }, [masterVolume]);

  const triggerPad = useCallback(
    (idx: number) => {
      const pad = DEFAULT_PADS[idx];
      setFlash(idx);
      window.setTimeout(() => setFlash((f) => (f === idx ? null : f)), 120);

      if (pad.type === 'drum') {
        const ctx = ensureAudio();
        playDrum(ctx, outGainRef.current!, pad.kind);
      } else {
        const binding = chops[idx];
        if (!binding) return;
        const deck = pad.deck === 'A' ? deckA : deckB;
        deck.stutter(binding.time, binding.duration);
      }
    },
    [chops, deckA, deckB, ensureAudio]
  );

  const handlePadClick = useCallback(
    (idx: number, shift: boolean) => {
      setSelectedPad(idx);
      const pad = DEFAULT_PADS[idx];
      if (bindMode && pad.type === 'chop') {
        const deck = pad.deck === 'A' ? deckA : deckB;
        setChops((c) => ({
          ...c,
          [idx]: { time: deck.state.currentTime, duration: 500 },
        }));
        return;
      }
      if (shift && pad.type === 'chop') {
        const deck = pad.deck === 'A' ? deckA : deckB;
        setChops((c) => ({
          ...c,
          [idx]: { time: deck.state.currentTime, duration: 500 },
        }));
        return;
      }
      triggerPad(idx);
    },
    [bindMode, deckA, deckB, triggerPad]
  );

  // Keyboard triggers
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      const idx = PAD_KEYS.indexOf(key);
      if (idx >= 0) {
        e.preventDefault();
        triggerPad(idx);
      } else if (key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [triggerPad]);

  // Step sequencer: high-res scheduler via lookahead (simpler: setInterval)
  useEffect(() => {
    if (!playing) {
      setStep(0);
      return;
    }
    ensureAudio();
    const stepMs = 60_000 / bpm / 4; // 16th notes
    let s = 0;
    setStep(0);
    const startAt = performance.now();
    const id = window.setInterval(() => {
      // determine step based on elapsed time (more stable than incrementing)
      const elapsed = performance.now() - startAt;
      const nextStep = Math.floor(elapsed / stepMs) % 16;
      if (nextStep !== s) {
        s = nextStep;
        setStep(s);
        for (let p = 0; p < 16; p++) {
          if (pattern[p][s]) {
            triggerPad(p);
          }
        }
      }
    }, Math.max(6, stepMs / 4));
    return () => window.clearInterval(id);
  }, [playing, bpm, pattern, triggerPad, ensureAudio]);

  const toggleStep = useCallback(
    (padIdx: number, stepIdx: number) => {
      setPattern((prev) => {
        const next = prev.map((row) => [...row]);
        next[padIdx][stepIdx] = next[padIdx][stepIdx] ? 0 : 1;
        return next;
      });
    },
    []
  );

  const clearPattern = useCallback(() => {
    setPattern(Array.from({ length: 16 }, () => Array(16).fill(0)));
  }, []);

  const padBg = useMemo(
    () => [
      ['#f472b6', '#ec4899', '#f43f5e', '#ef4444'],
      ['#fcd34d', '#f59e0b', '#eab308', '#facc15'],
      ['#a3e635', '#84cc16', '#22c55e', '#10b981'],
      ['#67e8f9', '#22d3ee', '#a78bfa', '#c084fc'],
    ],
    []
  );

  return (
    <div className="panel p-3 sm:p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg sm:text-xl tracking-widest text-white/90">
            AKC MPC
          </span>
          <span className="pill hidden sm:inline-flex">16 PADS</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setBindMode((b) => !b)}
            className={`neon-btn ${bindMode ? 'neon-btn-amber pulse-glow' : ''}`}
            title="Toggle bind mode: tap a chop pad to capture the current deck timestamp"
          >
            {bindMode ? '● Binding…' : 'Bind Chop'}
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            className={`neon-btn ${playing ? 'neon-btn-lime' : ''}`}
          >
            {playing ? '■ Stop' : '▶ Loop'}
          </button>
          <button onClick={clearPattern} className="neon-btn">
            Clear
          </button>
          <div className="flex items-center gap-1">
            <span className="label-cap">BPM</span>
            <input
              type="number"
              min={40}
              max={220}
              value={bpm}
              onChange={(e) =>
                setBpm(Math.max(40, Math.min(220, Number(e.target.value) || 96)))
              }
              className="w-16 px-2 py-1 text-[16px] font-mono bg-black/60 border border-white/10 rounded"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Pads */}
        <div>
          <div className="label-cap mb-2 hidden sm:block">Pads (keys {PAD_KEYS.join(' ')})</div>
          <div className="label-cap mb-2 sm:hidden">Pads</div>
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-xl bg-black/50 border border-white/10">
            {DEFAULT_PADS.map((pad, idx) => {
              const row = Math.floor(idx / 4);
              const col = idx % 4;
              const color = padBg[row][col];
              const flashing = flash === idx;
              const selected = selectedPad === idx;
              const isChop = pad.type === 'chop';
              const bound = isChop && chops[idx];
              return (
                <button
                  key={idx}
                  onClick={(e) => handlePadClick(idx, e.shiftKey)}
                  className="aspect-square rounded-lg relative overflow-hidden border-2 transition-all active:scale-95"
                  style={{
                    background: `linear-gradient(160deg, ${color}33, ${color}08)`,
                    borderColor: selected ? color : 'rgba(255,255,255,0.12)',
                    boxShadow: flashing
                      ? `0 0 28px ${color}, inset 0 0 20px ${color}88`
                      : `inset 0 0 14px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.4)`,
                    color,
                  }}
                  title={`${PAD_LABELS[idx]} (key: ${PAD_KEYS[idx]})`}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[10px] font-bold">
                    <span className="text-white/80 text-xs">{PAD_LABELS[idx]}</span>
                    {isChop ? (
                      <span className="text-[9px] opacity-70">
                        {bound ? `${bound.time.toFixed(1)}s` : 'unbound'}
                      </span>
                    ) : (
                      <span className="text-[9px] opacity-50">{PAD_KEYS[idx]}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="text-[10px] text-white/40 mt-2 leading-snug">
            Tip: Tap Bind Chop then tap a CHOP pad to capture the current deck timestamp. Tap the
            pad again to stutter back — loop slices from any YouTube track.
          </div>
        </div>

        {/* Step sequencer */}
        <div>
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="label-cap truncate">
              Seq — editing:{' '}
              <span style={{ color: padBg[Math.floor(selectedPad / 4)][selectedPad % 4] }}>
                {PAD_LABELS[selectedPad]}
              </span>
            </div>
            <div className="pill shrink-0">{playing ? `STEP ${step + 1}/16` : '16 STEPS'}</div>
          </div>

          {/* Pad-select chips — scroll horizontally on phone, grid on larger screens */}
          <div className="flex gap-1 overflow-x-auto pb-1 mb-2 -mx-1 px-1 sm:grid sm:grid-cols-8 lg:hidden">
            {DEFAULT_PADS.map((_pad, pIdx) => {
              const color = padBg[Math.floor(pIdx / 4)][pIdx % 4];
              const isActive = selectedPad === pIdx;
              const hasSteps = pattern[pIdx].some((x) => x);
              return (
                <button
                  key={pIdx}
                  onClick={() => setSelectedPad(pIdx)}
                  className="shrink-0 min-w-[52px] px-2 py-1.5 rounded text-[10px] font-bold border transition-all"
                  style={{
                    background: isActive ? `${color}33` : 'rgba(255,255,255,0.04)',
                    borderColor: isActive ? color : 'rgba(255,255,255,0.08)',
                    color: isActive ? color : 'rgba(255,255,255,0.7)',
                    boxShadow: isActive ? `0 0 10px -2px ${color}` : 'none',
                  }}
                >
                  {PAD_LABELS[pIdx]}
                  {hasSteps && <span className="ml-1 opacity-60">•</span>}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-1 p-2 sm:p-3 rounded-xl bg-black/50 border border-white/10">
            {/* current pad row editor */}
            <div
              className="grid gap-[3px] sm:gap-1"
              style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}
            >
              {pattern[selectedPad].map((on, i) => {
                const isBeat = i % 4 === 0;
                const isCurrent = playing && step === i;
                const color = padBg[Math.floor(selectedPad / 4)][selectedPad % 4];
                return (
                  <button
                    key={i}
                    onClick={() => toggleStep(selectedPad, i)}
                    className="h-9 sm:h-10 rounded touch-manipulation"
                    style={{
                      background: on
                        ? `linear-gradient(180deg, ${color}, ${color}66)`
                        : isBeat
                        ? 'rgba(255,255,255,0.07)'
                        : 'rgba(255,255,255,0.03)',
                      border: isCurrent
                        ? `1px solid ${color}`
                        : '1px solid rgba(255,255,255,0.06)',
                      boxShadow: on ? `0 0 10px ${color}88` : 'none',
                    }}
                    aria-label={`step ${i + 1}`}
                  />
                );
              })}
            </div>

            {/* mini overview — hidden on small screens, click rows to switch pads on desktop */}
            <div
              className="mt-2 gap-[2px] hidden lg:grid"
              style={{ gridTemplateRows: 'repeat(16, 6px)' }}
            >
              {pattern.map((row, pIdx) => (
                <div
                  key={pIdx}
                  className="grid gap-[2px] cursor-pointer"
                  style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}
                  onClick={() => setSelectedPad(pIdx)}
                >
                  {row.map((on, i) => {
                    const isCurrent = playing && step === i;
                    const color = padBg[Math.floor(pIdx / 4)][pIdx % 4];
                    return (
                      <div
                        key={i}
                        className="h-[6px] rounded-[1px]"
                        style={{
                          background: on
                            ? color
                            : isCurrent
                            ? 'rgba(255,255,255,0.15)'
                            : 'rgba(255,255,255,0.04)',
                          opacity: pIdx === selectedPad ? 1 : 0.55,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="text-[10px] text-white/40 mt-2 leading-snug">
            <span className="hidden lg:inline">
              Click the mini rows to switch pads. Spacebar plays/stops the loop.
            </span>
            <span className="lg:hidden">
              Swipe the pad chips above to pick which pad you're programming.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
