import { useCallback, useEffect, useRef, useState } from 'react';
import Deck, { type DeckEQ } from './components/Deck';
import Mixer from './components/Mixer';
import MPC from './components/MPC';
import { useYouTubePlayer } from './hooks/useYouTubePlayer';
import { runBeatMatch, runDropMix, runGenreBlend } from './utils/aiMix';

const NEUTRAL_EQ: DeckEQ = { low: 0.5, mid: 0.5, high: 0.5 };

/**
 * Because YouTube iframes can't be routed through Web Audio API (cross-origin),
 * we simulate EQ by modulating deck volume. Each EQ knob acts DJ-kill-style:
 * at 0.5 it's neutral (no attenuation); below 0.5 it attenuates that frequency's
 * contribution. The three knobs combine multiplicatively (with each contributing
 * 1/3 of the attenuation envelope). This gives satisfying kill-switch feel
 * while remaining honest about what's happening.
 */
function eqGain(eq: DeckEQ): number {
  // each band maps 0..1 -> 0.2..1.2, knob at 0.5 == 1.0 (neutral, weight 1/3)
  const bandGain = (v: number) => {
    // at 0 -> 0.0 (kill), at 0.5 -> 1.0, at 1 -> 1.2 (slight boost)
    if (v <= 0.5) return v * 2; // 0..1
    return 1 + (v - 0.5) * 0.4; // 1..1.2
  };
  // combine as average (so one kill doesn't fully silence the other two bands)
  const g = (bandGain(eq.low) + bandGain(eq.mid) + bandGain(eq.high)) / 3;
  return Math.max(0, Math.min(1.2, g));
}

/** Equal-power crossfade: at x=0.5 both decks are at ~0.707 */
function crossGains(x: number): { a: number; b: number } {
  const a = Math.cos((x * Math.PI) / 2);
  const b = Math.sin((x * Math.PI) / 2);
  return { a, b };
}

export default function DJApp() {
  const deckA = useYouTubePlayer('yt-deck-a');
  const deckB = useYouTubePlayer('yt-deck-b');

  const [eqA, setEQA] = useState<DeckEQ>(NEUTRAL_EQ);
  const [eqB, setEQB] = useState<DeckEQ>(NEUTRAL_EQ);
  const [volA, setVolA] = useState(0.85);
  const [volB, setVolB] = useState(0.85);
  const [master, setMaster] = useState(0.9);
  const [crossfade, setCrossfade] = useState(0.5);
  const [aiRunning, setAiRunning] = useState<string | null>(null);

  // Keep latest EQs in refs for the AI animator
  const eqARef = useRef(eqA);
  const eqBRef = useRef(eqB);
  useEffect(() => {
    eqARef.current = eqA;
  }, [eqA]);
  useEffect(() => {
    eqBRef.current = eqB;
  }, [eqB]);

  // Derive effective YouTube volumes (0..1) and push into players.
  useEffect(() => {
    const { a, b } = crossGains(crossfade);
    const effA = master * volA * a * eqGain(eqA);
    const effB = master * volB * b * eqGain(eqB);
    deckA.setVolume(Math.max(0, Math.min(1, effA)));
    deckB.setVolume(Math.max(0, Math.min(1, effB)));
  }, [crossfade, master, volA, volB, eqA, eqB, deckA, deckB]);

  const levels = {
    a: (() => {
      const { a } = crossGains(crossfade);
      return deckA.state.isPlaying ? master * volA * a * eqGain(eqA) : 0;
    })(),
    b: (() => {
      const { b } = crossGains(crossfade);
      return deckB.state.isPlaying ? master * volB * b * eqGain(eqB) : 0;
    })(),
  };

  const runAI = useCallback(
    async (name: string, fn: () => Promise<void>) => {
      if (aiRunning) return;
      setAiRunning(name);
      try {
        await fn();
      } finally {
        setAiRunning(null);
      }
    },
    [aiRunning]
  );

  const onAIBeatMatch = () =>
    runAI('Beat Match', () =>
      runBeatMatch({
        deckA,
        deckB,
        setCrossfade,
        setEQA,
        setEQB,
        eqA: eqARef.current,
        eqB: eqBRef.current,
      })
    );
  const onAIGenreBlend = () =>
    runAI('Genre Blend', () =>
      runGenreBlend({
        deckA,
        deckB,
        setCrossfade,
        setEQA,
        setEQB,
        eqA: eqARef.current,
        eqB: eqBRef.current,
      })
    );
  const onAIDropMix = () =>
    runAI('Drop Mix', () =>
      runDropMix({
        deckA,
        deckB,
        setCrossfade,
        setEQA,
        setEQB,
        eqA: eqARef.current,
        eqB: eqBRef.current,
      })
    );

  return (
    <div className="min-h-full w-full flex flex-col">
      <header className="px-4 sm:px-6 py-3 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-display text-xl"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #22d3ee, #3a0e4e)',
              boxShadow: '0 0 20px -4px #22d3ee',
            }}
          >
            ♫
          </div>
          <div>
            <div
              className="font-display text-2xl tracking-[0.25em]"
              style={{
                background: 'linear-gradient(90deg, #67e8f9, #f0abfc)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              YT DJ MIX LAB
            </div>
            <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
              YouTube turntables · EQ · AI blends · MPC
            </div>
          </div>
        </div>
        <div className="text-[10px] font-mono text-white/50 leading-tight max-w-xs text-right">
          Paste two YouTube URLs to load the decks. Drag knobs up/down, work the crossfader, and
          hit an AI button to auto-mix.
        </div>
      </header>

      <main className="flex-1 p-3 sm:p-4 flex flex-col gap-4 max-w-[1400px] mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Deck
            side="A"
            accent="#67e8f9"
            controller={deckA}
            eq={eqA}
            onEQChange={setEQA}
            volume={volA}
            onVolume={setVolA}
          />
          <Mixer
            crossfade={crossfade}
            onCrossfade={setCrossfade}
            masterVolume={master}
            onMasterVolume={setMaster}
            onAIBeatMatch={onAIBeatMatch}
            onAIGenreBlend={onAIGenreBlend}
            onAIDropMix={onAIDropMix}
            aiRunning={aiRunning}
            levels={levels}
          />
          <Deck
            side="B"
            accent="#f0abfc"
            controller={deckB}
            eq={eqB}
            onEQChange={setEQB}
            volume={volB}
            onVolume={setVolB}
          />
        </div>

        <MPC deckA={deckA} deckB={deckB} masterVolume={master} />

        <footer className="text-[10px] font-mono text-white/40 text-center pb-3 leading-relaxed">
          <span className="text-white/60">Keys:</span> 1-4 / Q-R / A-F / Z-V trigger pads · Space
          plays the loop ·{' '}
          <span className="text-white/60">Shift-click</span> a CHOP pad to capture the current deck
          timestamp ·{' '}
          <span className="text-white/60">Double-click</span> an EQ knob to reset it. Try layering
          a classic break on Deck A with a vocal acapella on Deck B, kill Deck A's mids and ride
          the crossfader 🎛️
        </footer>
      </main>
    </div>
  );
}
