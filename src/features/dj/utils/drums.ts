// Synthesized drum sounds via Web Audio API. Each function schedules a voice
// on the provided AudioContext and routes through the supplied destination.

export type DrumKind =
  | 'kick'
  | 'snare'
  | 'clap'
  | 'closedHat'
  | 'openHat'
  | 'lowTom'
  | 'highTom'
  | 'rim'
  | 'cowbell'
  | 'crash'
  | 'perc'
  | 'zap';

export interface Voice {
  stop: (when?: number) => void;
}

function env(ctx: AudioContext, when: number, attack: number, release: number, peak = 1) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(peak, when + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, when + attack + release);
  return g;
}

function whiteNoiseBuffer(ctx: AudioContext, seconds = 1): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export function playDrum(
  ctx: AudioContext,
  out: AudioNode,
  kind: DrumKind,
  when = ctx.currentTime,
  velocity = 1
): Voice {
  const master = ctx.createGain();
  master.gain.value = velocity;
  master.connect(out);

  switch (kind) {
    case 'kick': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, when);
      osc.frequency.exponentialRampToValueAtTime(40, when + 0.18);
      const g = env(ctx, when, 0.002, 0.35, 1);
      osc.connect(g).connect(master);
      osc.start(when);
      osc.stop(when + 0.45);
      return { stop: (t) => osc.stop(t ?? ctx.currentTime) };
    }
    case 'snare': {
      const noise = ctx.createBufferSource();
      noise.buffer = whiteNoiseBuffer(ctx, 0.3);
      const nFilter = ctx.createBiquadFilter();
      nFilter.type = 'highpass';
      nFilter.frequency.value = 1200;
      const nG = env(ctx, when, 0.002, 0.18, 0.8);
      noise.connect(nFilter).connect(nG).connect(master);

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, when);
      osc.frequency.exponentialRampToValueAtTime(110, when + 0.1);
      const oG = env(ctx, when, 0.002, 0.12, 0.6);
      osc.connect(oG).connect(master);

      noise.start(when);
      noise.stop(when + 0.25);
      osc.start(when);
      osc.stop(when + 0.15);
      return { stop: () => {} };
    }
    case 'clap': {
      const out1 = master;
      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.value = 1200;
      hp.Q.value = 0.8;
      for (let i = 0; i < 4; i++) {
        const t = when + i * 0.012;
        const n = ctx.createBufferSource();
        n.buffer = whiteNoiseBuffer(ctx, 0.15);
        const g = env(ctx, t, 0.001, i === 3 ? 0.14 : 0.03, 0.55);
        n.connect(hp).connect(g).connect(out1);
        n.start(t);
        n.stop(t + 0.15);
      }
      return { stop: () => {} };
    }
    case 'closedHat': {
      const n = ctx.createBufferSource();
      n.buffer = whiteNoiseBuffer(ctx, 0.08);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 7000;
      const g = env(ctx, when, 0.001, 0.04, 0.5);
      n.connect(hp).connect(g).connect(master);
      n.start(when);
      n.stop(when + 0.1);
      return { stop: () => {} };
    }
    case 'openHat': {
      const n = ctx.createBufferSource();
      n.buffer = whiteNoiseBuffer(ctx, 0.4);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 6500;
      const g = env(ctx, when, 0.002, 0.3, 0.45);
      n.connect(hp).connect(g).connect(master);
      n.start(when);
      n.stop(when + 0.5);
      return { stop: () => {} };
    }
    case 'lowTom':
    case 'highTom': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const base = kind === 'lowTom' ? 90 : 180;
      osc.frequency.setValueAtTime(base * 1.4, when);
      osc.frequency.exponentialRampToValueAtTime(base, when + 0.2);
      const g = env(ctx, when, 0.004, 0.35, 0.9);
      osc.connect(g).connect(master);
      osc.start(when);
      osc.stop(when + 0.5);
      return { stop: () => {} };
    }
    case 'rim': {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 900;
      const g = env(ctx, when, 0.001, 0.04, 0.4);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 500;
      osc.connect(hp).connect(g).connect(master);
      osc.start(when);
      osc.stop(when + 0.08);
      return { stop: () => {} };
    }
    case 'cowbell': {
      const f1 = ctx.createOscillator();
      const f2 = ctx.createOscillator();
      f1.type = 'square';
      f2.type = 'square';
      f1.frequency.value = 808;
      f2.frequency.value = 540;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 800;
      bp.Q.value = 1.2;
      const g = env(ctx, when, 0.002, 0.25, 0.5);
      f1.connect(bp);
      f2.connect(bp);
      bp.connect(g).connect(master);
      f1.start(when);
      f2.start(when);
      f1.stop(when + 0.3);
      f2.stop(when + 0.3);
      return { stop: () => {} };
    }
    case 'crash': {
      const n = ctx.createBufferSource();
      n.buffer = whiteNoiseBuffer(ctx, 1.2);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 4000;
      const g = env(ctx, when, 0.002, 0.9, 0.4);
      n.connect(hp).connect(g).connect(master);
      n.start(when);
      n.stop(when + 1.2);
      return { stop: () => {} };
    }
    case 'perc': {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, when);
      osc.frequency.exponentialRampToValueAtTime(440, when + 0.12);
      const g = env(ctx, when, 0.002, 0.15, 0.5);
      osc.connect(g).connect(master);
      osc.start(when);
      osc.stop(when + 0.2);
      return { stop: () => {} };
    }
    case 'zap': {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1400, when);
      osc.frequency.exponentialRampToValueAtTime(120, when + 0.25);
      const g = env(ctx, when, 0.001, 0.25, 0.5);
      osc.connect(g).connect(master);
      osc.start(when);
      osc.stop(when + 0.3);
      return { stop: () => {} };
    }
  }
}
