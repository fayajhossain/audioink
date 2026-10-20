import { Platform } from 'react-native';

/**
 * Ensures anonymous telemetry in react-native-executorch is turned off
 * for privacy and offline-first compliance.
 */
export function disableExecuTorchTelemetry(): void {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    /* eslint-disable-next-line @typescript-eslint/no-require-imports */
    const { setTelemetryEnabled } = require('react-native-executorch');
    if (typeof setTelemetryEnabled === 'function') {
      setTelemetryEnabled(false);
      console.log('[Telemetry] ExecuTorch anonymous telemetry successfully disabled.');
    }
  } catch (error) {
    console.warn('[Telemetry] Unable to disable ExecuTorch telemetry (native module not initialized yet):', error);
  }
}

