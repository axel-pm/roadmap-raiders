// Vibration wrapper. Android fires; iOS Safari ignores navigator.vibrate (no-op).

const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export function haptic(kind: 'light' | 'medium' | 'heavy' | 'success' = 'light'): void {
  if (!canVibrate) return;
  const pattern = kind === 'light' ? 10
    : kind === 'medium' ? 18
    : kind === 'heavy' ? [24, 20, 28]
    : [12, 40, 12];
  try {
    navigator.vibrate(pattern);
  } catch { /* ignore */ }
}
