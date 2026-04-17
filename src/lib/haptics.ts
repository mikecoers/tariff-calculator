export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'rumble';

const patterns: Record<HapticType, number | number[]> = {
  light: 8,
  medium: 15,
  heavy: 30,
  success: [12, 40, 12],
  warning: [20, 50, 20],
  error: [40, 30, 40, 30, 40],
  // Longer thunder-like buzz for big moments (HIT! HR!)
  rumble: [30, 20, 60, 20, 100, 20, 50]
};

let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
  try {
    localStorage.setItem('kp.haptics', value ? '1' : '0');
  } catch {}
}

export function loadHapticsPref(): boolean {
  try {
    const v = localStorage.getItem('kp.haptics');
    if (v === '0') {
      enabled = false;
    }
  } catch {}
  return enabled;
}

export function haptic(type: HapticType = 'light'): void {
  if (!enabled) return;
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(patterns[type]);
    }
  } catch {
    // no-op
  }
}
