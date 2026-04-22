import { ALLOWED_RATES, nearestRate } from './youtube';
import type { DeckController } from '../hooks/useYouTubePlayer';
import type { DeckEQ } from '../components/Deck';

export interface AIMixCtx {
  deckA: DeckController;
  deckB: DeckController;
  setCrossfade: (v: number) => void;
  setEQA: (eq: DeckEQ) => void;
  setEQB: (eq: DeckEQ) => void;
  eqA: DeckEQ;
  eqB: DeckEQ;
}

/**
 * Ease-in-out cubic
 */
function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Animate a value from start to end over duration (ms) calling onFrame with eased value.
 * Returns a cancel function.
 */
export function tween(
  start: number,
  end: number,
  duration: number,
  onFrame: (v: number) => void,
  onDone?: () => void
): () => void {
  const t0 = performance.now();
  let cancelled = false;
  const tick = () => {
    if (cancelled) return;
    const t = Math.min(1, (performance.now() - t0) / duration);
    onFrame(start + (end - start) * easeInOut(t));
    if (t < 1) requestAnimationFrame(tick);
    else onDone?.();
  };
  requestAnimationFrame(tick);
  return () => {
    cancelled = true;
  };
}

/** Beat match: nudge deck B's rate toward deck A's, then fade A→B smoothly. */
export async function runBeatMatch(ctx: AIMixCtx): Promise<void> {
  const { deckA, deckB, setCrossfade } = ctx;
  const targetRate = deckA.state.rate;
  const bRate = deckB.state.rate;
  // Nudge B toward A
  const steps = 4;
  for (let i = 1; i <= steps; i++) {
    const r = nearestRate(bRate + ((targetRate - bRate) * i) / steps);
    deckB.setRate(r);
    await delay(220);
  }
  // Make sure B is playing
  if (!deckB.state.isPlaying && deckB.state.videoId) deckB.play();
  await runCrossfade(0, 1, 4800, setCrossfade);
}

/** Genre crossblend: rhythmic back-and-forth crossfade with EQ swaps. */
export async function runGenreBlend(ctx: AIMixCtx): Promise<void> {
  const { deckA, deckB, setCrossfade, setEQA, setEQB } = ctx;
  if (!deckA.state.isPlaying && deckA.state.videoId) deckA.play();
  if (!deckB.state.isPlaying && deckB.state.videoId) deckB.play();
  // 4 bars at ~1s each
  const waypoints = [0.2, 0.7, 0.3, 0.8, 0.5];
  for (let i = 0; i < waypoints.length - 1; i++) {
    await runCrossfade(waypoints[i], waypoints[i + 1], 900, setCrossfade);
    // Swap the 'losing' deck's low/mid
    if (waypoints[i + 1] > 0.5) {
      setEQA({ low: 0.2, mid: 0.4, high: 0.9 });
      setEQB({ low: 0.8, mid: 0.6, high: 0.5 });
    } else {
      setEQA({ low: 0.8, mid: 0.6, high: 0.5 });
      setEQB({ low: 0.2, mid: 0.4, high: 0.9 });
    }
    await delay(180);
  }
  // restore neutral
  setEQA({ low: 0.5, mid: 0.5, high: 0.5 });
  setEQB({ low: 0.5, mid: 0.5, high: 0.5 });
}

/** Drop mix: kill low of outgoing, build high of incoming, then SLAM crossfade. */
export async function runDropMix(ctx: AIMixCtx): Promise<void> {
  const { deckA, deckB, setCrossfade, setEQA, setEQB } = ctx;
  if (!deckA.state.isPlaying && deckA.state.videoId) deckA.play();
  if (!deckB.state.isPlaying && deckB.state.videoId) deckB.play();

  // build tension: A loses low, B gains highs
  await Promise.all([
    animateEQ(setEQA, ctx.eqA, { low: 0.05, mid: 0.4, high: 0.7 }, 1600, (v) => (ctx.eqA = v)),
    animateEQ(setEQB, ctx.eqB, { low: 0.5, mid: 0.5, high: 1.0 }, 1600, (v) => (ctx.eqB = v)),
  ]);
  // small crossfade nudge
  await runCrossfade(0, 0.3, 1200, setCrossfade);
  await delay(200);
  // THE DROP
  await runCrossfade(0.3, 0.85, 250, setCrossfade);
  await Promise.all([
    animateEQ(setEQA, { low: 0.05, mid: 0.4, high: 0.7 }, { low: 0.5, mid: 0.5, high: 0.5 }, 1200, () => {}),
    animateEQ(
      setEQB,
      { low: 0.5, mid: 0.5, high: 1.0 },
      { low: 0.9, mid: 0.7, high: 0.6 },
      1200,
      () => {}
    ),
  ]);
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
    tween(from, to, duration, setCrossfade, resolve);
  });
}

function animateEQ(
  setEQ: (eq: DeckEQ) => void,
  from: DeckEQ,
  to: DeckEQ,
  duration: number,
  save: (eq: DeckEQ) => void
): Promise<void> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - t0) / duration);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const v = {
        low: from.low + (to.low - from.low) * e,
        mid: from.mid + (to.mid - from.mid) * e,
        high: from.high + (to.high - from.high) * e,
      };
      setEQ(v);
      save(v);
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

export { ALLOWED_RATES };
