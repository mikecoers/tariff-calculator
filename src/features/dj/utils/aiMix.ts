import type { DeckSource } from '../sources/types';
import type { DeckEQ } from '../components/Deck';

export interface AIMixCtx {
  deckA: DeckSource | null;
  deckB: DeckSource | null;
  setCrossfade: (v: number) => void;
  setEQA: (eq: DeckEQ) => void;
  setEQB: (eq: DeckEQ) => void;
  eqA: DeckEQ;
  eqB: DeckEQ;
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function runCrossfade(
  from: number,
  to: number,
  duration: number,
  setCrossfade: (v: number) => void
): Promise<void> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - t0) / duration);
      setCrossfade(from + (to - from) * easeInOut(t));
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

function animateEQ(
  setEQ: (eq: DeckEQ) => void,
  from: DeckEQ,
  to: DeckEQ,
  duration: number
): Promise<void> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - t0) / duration);
      const e = easeInOut(t);
      setEQ({
        low: from.low + (to.low - from.low) * e,
        mid: from.mid + (to.mid - from.mid) * e,
        high: from.high + (to.high - from.high) * e,
      });
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

async function ensurePlaying(source: DeckSource | null) {
  if (!source) return;
  const s = source.getState();
  if (!s.isPlaying && s.track) await source.play();
}

export async function runBeatMatch(ctx: AIMixCtx): Promise<void> {
  // Without real BPM detection we just smoothly fade from A to B.
  await ensurePlaying(ctx.deckA);
  await ensurePlaying(ctx.deckB);
  await runCrossfade(0, 1, 4800, ctx.setCrossfade);
}

export async function runGenreBlend(ctx: AIMixCtx): Promise<void> {
  await ensurePlaying(ctx.deckA);
  await ensurePlaying(ctx.deckB);
  const waypoints = [0.2, 0.7, 0.3, 0.8, 0.5];
  for (let i = 0; i < waypoints.length - 1; i++) {
    await runCrossfade(waypoints[i], waypoints[i + 1], 900, ctx.setCrossfade);
    if (waypoints[i + 1] > 0.5) {
      ctx.setEQA({ low: 0.2, mid: 0.4, high: 0.9 });
      ctx.setEQB({ low: 0.8, mid: 0.6, high: 0.5 });
    } else {
      ctx.setEQA({ low: 0.8, mid: 0.6, high: 0.5 });
      ctx.setEQB({ low: 0.2, mid: 0.4, high: 0.9 });
    }
    await delay(180);
  }
  ctx.setEQA({ low: 0.5, mid: 0.5, high: 0.5 });
  ctx.setEQB({ low: 0.5, mid: 0.5, high: 0.5 });
}

export async function runDropMix(ctx: AIMixCtx): Promise<void> {
  await ensurePlaying(ctx.deckA);
  await ensurePlaying(ctx.deckB);

  await Promise.all([
    animateEQ(ctx.setEQA, ctx.eqA, { low: 0.05, mid: 0.4, high: 0.7 }, 1600),
    animateEQ(ctx.setEQB, ctx.eqB, { low: 0.5, mid: 0.5, high: 1.0 }, 1600),
  ]);
  await runCrossfade(0, 0.3, 1200, ctx.setCrossfade);
  await delay(200);
  await runCrossfade(0.3, 0.85, 250, ctx.setCrossfade);
  await Promise.all([
    animateEQ(
      ctx.setEQA,
      { low: 0.05, mid: 0.4, high: 0.7 },
      { low: 0.5, mid: 0.5, high: 0.5 },
      1200
    ),
    animateEQ(
      ctx.setEQB,
      { low: 0.5, mid: 0.5, high: 1.0 },
      { low: 0.9, mid: 0.7, high: 0.6 },
      1200
    ),
  ]);
}
