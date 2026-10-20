import { energyBasedVADFallback } from '../vad';

export function runVADTests() {
  console.log('--- Running AudioInk VAD Tests ---');

  const sampleRate = 16000;
  // Create synthetic audio:
  // 0.5s silence + 1.5s speech + 1.2s silence (pause) + 1.5s speech + 0.5s silence
  const totalDuration = 0.5 + 1.5 + 1.2 + 1.5 + 0.5; // 5.2 seconds
  const totalSamples = Math.floor(totalDuration * sampleRate);
  const waveform = new Float32Array(totalSamples);

  // Generate 440Hz sine wave tone for speech portions
  function injectTone(startSec: number, durationSec: number, amplitude = 0.3) {
    const startIdx = Math.floor(startSec * sampleRate);
    const endIdx = startIdx + Math.floor(durationSec * sampleRate);
    for (let i = startIdx; i < endIdx && i < waveform.length; i++) {
      const t = (i - startIdx) / sampleRate;
      waveform[i] = amplitude * Math.sin(2 * Math.PI * 440 * t);
    }
  }

  // Inject speech segments
  injectTone(0.5, 1.5); // Speech 1: 0.5s to 2.0s
  injectTone(3.2, 1.5); // Speech 2: 3.2s to 4.7s (Gap of 1.2s = 1200ms)

  const result = energyBasedVADFallback(waveform, sampleRate);

  console.log(`Detected speech segments: ${result.speechSegments.length}`);
  console.log(`Detected pauses: ${result.pauses.length}`);

  assert(result.speechSegments.length === 2, `Expected 2 speech segments, got ${result.speechSegments.length}`);
  assert(result.pauses.length === 1, `Expected 1 pause between segments, got ${result.pauses.length}`);

  const pause = result.pauses[0];
  console.log(`Pause detected at ${pause.startMs}ms with length ${pause.lengthMs}ms`);
  assert(pause.lengthMs >= 1000 && pause.lengthMs <= 1400, `Pause length ${pause.lengthMs}ms outside expected ~1200ms window`);

  console.log('--- All VAD Tests Passed Successfully! ---\n');
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

runVADTests();

