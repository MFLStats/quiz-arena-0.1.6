type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';
export function triggerHaptic(type: HapticType) {
  if (typeof window === 'undefined' || !window.navigator || !window.navigator.vibrate) {
    return;
  }
  try {
    switch (type) {
      case 'light':
        window.navigator.vibrate(10);
        break;
      case 'medium':
        window.navigator.vibrate(40);
        break;
      case 'heavy':
        window.navigator.vibrate(80);
        break;
      case 'success':
        window.navigator.vibrate([50, 30, 50]);
        break;
      case 'error':
        window.navigator.vibrate([50, 100, 50, 100]);
        break;
      case 'warning':
        window.navigator.vibrate([30, 50, 30]);
        break;
    }
  } catch (e) {
    // Ignore errors on devices that don't support vibration or block it
    console.debug('Haptic feedback failed', e);
  }
}