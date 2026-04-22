/**
 * One AudioContext shared across decks + the MPC drum synth, so everything
 * feeds a single master bus and the user's system mixer sees one stream.
 * iOS Safari requires a user gesture before a suspended context can resume —
 * we expose `ensureRunning()` to be called from any user-initiated handler.
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

export function getAudioContext(): AudioContext {
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

export function getMasterGain(): GainNode {
  getAudioContext();
  return masterGain!;
}

export function setMasterVolume(v: number) {
  const g = getMasterGain();
  g.gain.setTargetAtTime(Math.max(0, Math.min(1.2, v)), g.context.currentTime, 0.015);
}

export async function ensureRunning(): Promise<void> {
  const c = getAudioContext();
  if (c.state === 'suspended') {
    try {
      await c.resume();
    } catch {
      // ignore — caller tried
    }
  }
}

/**
 * 3-band biquad EQ chain: low shelf @ 200Hz, peaking mid @ 1kHz, high shelf @ 5kHz.
 * Each knob is 0..1 where 0.5 = 0 dB (flat). Below 0.5 cuts (to -32 dB "kill"),
 * above 0.5 boosts (up to +9 dB).
 */
export function createEQChain(context: AudioContext) {
  const low = context.createBiquadFilter();
  low.type = 'lowshelf';
  low.frequency.value = 200;
  low.gain.value = 0;

  const mid = context.createBiquadFilter();
  mid.type = 'peaking';
  mid.frequency.value = 1000;
  mid.Q.value = 0.9;
  mid.gain.value = 0;

  const high = context.createBiquadFilter();
  high.type = 'highshelf';
  high.frequency.value = 5000;
  high.gain.value = 0;

  low.connect(mid);
  mid.connect(high);

  const setBand = (band: BiquadFilterNode, knob: number) => {
    // Below 0.5 → -32..0 dB (kill feel). Above 0.5 → 0..+9 dB.
    const clamped = Math.max(0, Math.min(1, knob));
    const gainDb = clamped <= 0.5 ? -32 * (1 - clamped * 2) : 18 * (clamped - 0.5);
    band.gain.setTargetAtTime(gainDb, context.currentTime, 0.02);
  };

  return {
    input: low,
    output: high,
    setEQ(eq: { low: number; mid: number; high: number }) {
      setBand(low, eq.low);
      setBand(mid, eq.mid);
      setBand(high, eq.high);
    },
  };
}
