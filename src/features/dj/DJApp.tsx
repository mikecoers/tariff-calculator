import { useCallback, useEffect, useRef, useState } from 'react';
import Deck, { type DeckEQ } from './components/Deck';
import Mixer from './components/Mixer';
import MPC from './components/MPC';
import ConfigModal from './components/ConfigModal';
import type { DeckSource, DeckSourceState } from './sources/types';
import { setMasterVolume } from './sources/audioGraph';
import { runBeatMatch, runDropMix, runGenreBlend } from './utils/aiMix';
import { completeAuthFromUrl } from './sources/spotifyAuth';

const NEUTRAL_EQ: DeckEQ = { low: 0.5, mid: 0.5, high: 0.5 };

/** Equal-power crossfade: at x=0.5 both decks are at ~0.707 */
function crossGains(x: number): { a: number; b: number } {
  const a = Math.cos((x * Math.PI) / 2);
  const b = Math.sin((x * Math.PI) / 2);
  return { a, b };
}

export default function DJApp() {
  const [eqA, setEQA] = useState<DeckEQ>(NEUTRAL_EQ);
  const [eqB, setEQB] = useState<DeckEQ>(NEUTRAL_EQ);
  const [volA, setVolA] = useState(0.85);
  const [volB, setVolB] = useState(0.85);
  const [master, setMaster] = useState(0.9);
  const [crossfade, setCrossfade] = useState(0.5);
  const [aiRunning, setAiRunning] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  const sourceA = useRef<DeckSource | null>(null);
  const sourceB = useRef<DeckSource | null>(null);
  const [stateA, setStateA] = useState<DeckSourceState | null>(null);
  const [stateB, setStateB] = useState<DeckSourceState | null>(null);

  // Complete Spotify OAuth on page load if we came back with ?code=
  useEffect(() => {
    void completeAuthFromUrl().catch((err) => {
      console.warn('Spotify auth completion failed', err);
    });
  }, []);

  // Subscribe to source state
  const onSourceA = useCallback((s: DeckSource | null) => {
    sourceA.current = s;
    if (!s) {
      setStateA(null);
      return;
    }
    const unsub = s.subscribe(setStateA);
    return unsub;
  }, []);
  const onSourceB = useCallback((s: DeckSource | null) => {
    sourceB.current = s;
    if (!s) {
      setStateB(null);
      return;
    }
    const unsub = s.subscribe(setStateB);
    return unsub;
  }, []);

  // Push master volume into shared graph
  useEffect(() => {
    setMasterVolume(master);
  }, [master]);

  // Compute effective crossfade multipliers (passed through to the Deck)
  const { a: gainA, b: gainB } = crossGains(crossfade);
  const masterFadeA = master * gainA;
  const masterFadeB = master * gainB;

  const levels = {
    a: stateA?.isPlaying ? volA * masterFadeA : 0,
    b: stateB?.isPlaying ? volB * masterFadeB : 0,
  };

  const eqARef = useRef(eqA);
  const eqBRef = useRef(eqB);
  useEffect(() => {
    eqARef.current = eqA;
  }, [eqA]);
  useEffect(() => {
    eqBRef.current = eqB;
  }, [eqB]);

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

  const aiCtx = () => ({
    deckA: sourceA.current,
    deckB: sourceB.current,
    setCrossfade,
    setEQA,
    setEQB,
    eqA: eqARef.current,
    eqB: eqBRef.current,
  });

  return (
    <div className="min-h-full w-full flex flex-col app-safe">
      <header className="px-3 sm:px-6 py-3 border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-display text-xl"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #22d3ee, #3a0e4e)',
              boxShadow: '0 0 20px -4px #22d3ee',
            }}
          >
            ♫
          </div>
          <div className="min-w-0">
            <div
              className="font-display text-xl sm:text-2xl tracking-[0.2em] sm:tracking-[0.25em] truncate"
              style={{
                background: 'linear-gradient(90deg, #67e8f9, #f0abfc)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              DJ MIX LAB
            </div>
            <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest truncate">
              Spotify · Apple Music · Suno · Bandcamp
            </div>
          </div>
        </div>
        <button onClick={() => setConfigOpen(true)} className="neon-btn shrink-0">
          ⚙ Connect
        </button>
      </header>

      <main className="flex-1 p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 max-w-[1400px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          <Deck
            side="A"
            accent="#67e8f9"
            eq={eqA}
            onEQChange={setEQA}
            volume={volA}
            onVolume={setVolA}
            masterFade={masterFadeA}
            onDeckSourceChange={(s) => onSourceA(s)}
            onOpenConfig={() => setConfigOpen(true)}
          />
          <Mixer
            crossfade={crossfade}
            onCrossfade={setCrossfade}
            masterVolume={master}
            onMasterVolume={setMaster}
            onAIBeatMatch={() => runAI('Beat Match', () => runBeatMatch(aiCtx()))}
            onAIGenreBlend={() => runAI('Genre Blend', () => runGenreBlend(aiCtx()))}
            onAIDropMix={() => runAI('Drop Mix', () => runDropMix(aiCtx()))}
            aiRunning={aiRunning}
            levels={levels}
          />
          <Deck
            side="B"
            accent="#f0abfc"
            eq={eqB}
            onEQChange={setEQB}
            volume={volB}
            onVolume={setVolB}
            masterFade={masterFadeB}
            onDeckSourceChange={(s) => onSourceB(s)}
            onOpenConfig={() => setConfigOpen(true)}
          />
        </div>

        <MPC
          getDeckASource={() => sourceA.current}
          getDeckBSource={() => sourceB.current}
          deckAState={stateA}
          deckBState={stateB}
        />

        <footer className="text-[10px] font-mono text-white/40 text-center pb-3 leading-relaxed px-2">
          <span className="hidden sm:inline">
            <span className="text-white/60">Keys:</span> 1-4 / Q-R / A-F / Z-V trigger pads · Space
            plays the loop ·{' '}
          </span>
          <span className="text-white/60">Tap &amp; hold</span> Bind Chop then tap a CHOP pad to
          capture the current deck timestamp.
        </footer>
      </main>

      <ConfigModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onStatusChange={() => {
          /* force re-render so the Connect buttons refresh */
          setConfigOpen((o) => o);
        }}
      />
    </div>
  );
}
