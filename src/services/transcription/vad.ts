import { AudioPause, TranscriptSegment } from '../../types/recording';
import { insertPause, updateRecordingStatus } from '../storage/database';
import { runFinalTranscriptionPass, VADSpeechSegment } from './whisper';

export interface VADAnalysisResult {
  speechSegments: VADSpeechSegment[];
  pauses: AudioPause[];
}

/**
 * Energy-based Voice Activity Detection fallback.
 * Computes RMS (Root Mean Square) energy over 20ms frames and identifies speech vs silence.
 */
export function energyBasedVADFallback(
  waveform: Float32Array,
  sampleRate = 16000,
  frameDurationMs = 20,
  energyThreshold = 0.015,
  minSpeechDurationMs = 250,
  minSilenceDurationMs = 300,
  recordingId = ''
): VADAnalysisResult {
  const frameLength = Math.floor((sampleRate * frameDurationMs) / 1000);
  const numFrames = Math.floor(waveform.length / frameLength);

  const frameEnergies: boolean[] = new Array(numFrames);

  for (let i = 0; i < numFrames; i++) {
    let sum = 0;
    const start = i * frameLength;
    for (let j = 0; j < frameLength; j++) {
      const val = waveform[start + j];
      sum += val * val;
    }
    const rms = Math.sqrt(sum / frameLength);
    frameEnergies[i] = rms >= energyThreshold;
  }

  const speechSegments: VADSpeechSegment[] = [];
  const pauses: AudioPause[] = [];

  let inSpeech = false;
  let speechStartFrame = 0;
  let lastSpeechEndFrame = 0;

  for (let i = 0; i < numFrames; i++) {
    const isVoice = frameEnergies[i];

    if (!inSpeech && isVoice) {
      inSpeech = true;
      speechStartFrame = i;

      // Check gap from previous speech segment
      if (lastSpeechEndFrame > 0) {
        const gapMs = (speechStartFrame - lastSpeechEndFrame) * frameDurationMs;
        if (gapMs >= minSilenceDurationMs) {
          pauses.push({
            id: `p_${lastSpeechEndFrame * frameDurationMs}`,
            recordingId: '',
            startMs: lastSpeechEndFrame * frameDurationMs,
            lengthMs: gapMs,
          });
        }
      }
    } else if (inSpeech && !isVoice) {
      // Lookahead: ensure silence persists for minSilenceDurationMs before ending segment
      const lookaheadFrames = Math.floor(minSilenceDurationMs / frameDurationMs);
      const remainingFrames = numFrames - i;
      const checkWindow = Math.min(lookaheadFrames, remainingFrames);

      let sustainedSilence = true;
      for (let k = 1; k < checkWindow; k++) {
        if (frameEnergies[i + k]) {
          sustainedSilence = false;
          break;
        }
      }

      if (sustainedSilence) {
        inSpeech = false;
        const segmentDurationMs = (i - speechStartFrame) * frameDurationMs;
        if (segmentDurationMs >= minSpeechDurationMs) {
          speechSegments.push({
            startMs: speechStartFrame * frameDurationMs,
            endMs: i * frameDurationMs,
          });
          lastSpeechEndFrame = i;
        }
      }
    }
  }

  // Handle trailing speech
  if (inSpeech) {
    speechSegments.push({
      startMs: speechStartFrame * frameDurationMs,
      endMs: numFrames * frameDurationMs,
    });
  }

  return { speechSegments, pauses };
}

/**
 * Runs VAD over recorded PCM waveform.
 * Uses native FsmnVoiceActivityDetector if available, otherwise falls back to calibrated energy VAD.
 */
export async function runVoiceActivityDetection(
  recordingId: string,
  waveform: Float32Array,
  vadDetector?: any,
  sampleRate = 16000
): Promise<VADAnalysisResult> {
  if (vadDetector && typeof vadDetector.detectVoice === 'function') {
    try {
      const detected: { start: number; end: number }[] = await vadDetector.detectVoice(waveform);
      const speechSegments: VADSpeechSegment[] = detected.map((d) => ({
        startMs: Math.round(d.start * 1000),
        endMs: Math.round(d.end * 1000),
      }));

      // Calculate pauses from the gaps between speech segments
      const pauses: AudioPause[] = [];
      for (let i = 1; i < speechSegments.length; i++) {
        const prev = speechSegments[i - 1];
        const curr = speechSegments[i];
        const gapMs = curr.startMs - prev.endMs;

        if (gapMs >= 300) {
          pauses.push({
            id: `pause_${recordingId}_${prev.endMs}`,
            recordingId,
            startMs: prev.endMs,
            lengthMs: gapMs,
          });
        }
      }

      return { speechSegments, pauses };
    } catch (e) {
      console.warn('[VAD] Native VAD error, falling back to energy VAD:', e);
    }
  }

  // Calibrated energy fallback
  const result = energyBasedVADFallback(waveform, sampleRate);
  result.pauses.forEach((p) => {
    p.recordingId = recordingId;
    p.id = `pause_${recordingId}_${p.startMs}`;
  });

  return result;
}

/**
 * Full End-to-End Final Pass Pipeline:
 * 1. Executes VAD to extract speech segments and pause gaps
 * 2. Writes pause rows to SQLite
 * 3. Transcribes each speech segment with Whisper Base/Small (<= 30s chunks)
 * 4. Writes final segment rows to SQLite
 * 5. Updates recording status to 'ready'
 * 6. Disposes models to free RAM
 */
export async function executeFullFinalPass(
  recordingId: string,
  waveform: Float32Array,
  whisperModel: any,
  vadDetector?: any,
  sampleRate = 16000
): Promise<{ segments: TranscriptSegment[]; pauses: AudioPause[] }> {
  await updateRecordingStatus(recordingId, 'processing');

  // 1. Detect VAD speech segments and pauses
  const { speechSegments, pauses } = await runVoiceActivityDetection(
    recordingId,
    waveform,
    vadDetector,
    sampleRate
  );

  // 2. Persist pauses
  for (const p of pauses) {
    await insertPause(p);
  }

  // 3. Transcribe speech segments
  const finalSegments = await runFinalTranscriptionPass(
    recordingId,
    speechSegments,
    waveform,
    whisperModel,
    sampleRate
  );

  const durationMs = Math.round((waveform.length / sampleRate) * 1000);
  await updateRecordingStatus(recordingId, 'ready', durationMs);

  // 4. Memory Management: Dispose models to free RAM
  if (vadDetector && typeof vadDetector.dispose === 'function') {
    try {
      vadDetector.dispose();
      console.log('[VAD] Native VAD detector successfully disposed.');
    } catch (e) {
      console.warn('[VAD] Error disposing VAD detector:', e);
    }
  }

  return { segments: finalSegments, pauses };
}

