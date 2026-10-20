import { TranscriptSegment } from '../../types/recording';
import { insertSegment } from '../storage/database';
import { logger } from '../logger';

export interface LiveTranscriptionController {
  feedChunk: (chunk: Float32Array, sampleOffset: number) => void;
  finish: () => Promise<void>;
  getCurrentDraft: () => { committed: string; nonCommitted: string };
}

/**
 * Creates a live transcription streaming pipeline using Whisper Tiny.
 * Saves committed clauses directly into the database stamped with audio offset.
 */
export function createLiveWhisperStream(
  recordingId: string,
  whisperSTT: any, // Whisper instance from useSpeechToText or createWhisperSpeechToText
  onDraftUpdate?: (committed: string, nonCommitted: string) => void
): LiveTranscriptionController {
  let committedSoFar = '';
  let currentNonCommitted = '';
  let clauseIndex = 0;
  let isStreamActive = true;
  let latestSampleOffset = 0;
  let lastClauseSampleOffset = 0;

  // Start the background streaming generator if native module is ready
  if (whisperSTT && typeof whisperSTT.stream === 'function') {
    (async () => {
      try {
        const streamGenerator = whisperSTT.stream({ language: 'en' });
        for await (const chunk of streamGenerator) {
          if (!isStreamActive) break;

          currentNonCommitted = chunk.nonCommitted || '';
          if (chunk.committed && chunk.committed !== committedSoFar) {
            const newlyCommitted = chunk.committed.slice(committedSoFar.length).trim();
            committedSoFar = chunk.committed;

            if (newlyCommitted.length > 0) {
              clauseIndex++;
              const startMs = Math.round((lastClauseSampleOffset / 16000) * 1000);
              const endMs = Math.round((latestSampleOffset / 16000) * 1000);
              lastClauseSampleOffset = latestSampleOffset;

              const segment: TranscriptSegment = {
                id: `s_${recordingId}_live_${clauseIndex}`,
                recordingId,
                startMs,
                endMs: Math.max(endMs, startMs + 500),
                text: newlyCommitted,
                source: 'live',
              };
              insertSegment(segment).catch(console.error);
            }
          }

          if (onDraftUpdate) {
            onDraftUpdate(committedSoFar, currentNonCommitted);
          }
        }
      } catch (err: any) {
        logger.error('WhisperStream', 'Live streaming generator error:', err?.message || err);
      }
    })();
  }

  return {
    feedChunk: (chunk: Float32Array, sampleOffset: number) => {
      latestSampleOffset = sampleOffset + chunk.length;
      if (!isStreamActive || !whisperSTT) return;
      if (typeof whisperSTT.streamInsert === 'function') {
        whisperSTT.streamInsert(chunk);
      }
    },

    finish: async () => {
      isStreamActive = false;
      if (whisperSTT && typeof whisperSTT.streamStop === 'function') {
        try {
          whisperSTT.streamStop();
        } catch (e) {
          console.warn('[WhisperStream] Error during streamStop:', e);
        }
      }
    },

    getCurrentDraft: () => ({
      committed: committedSoFar,
      nonCommitted: currentNonCommitted,
    }),
  };
}

export type VADSpeechSegment = {
  startMs: number;
  endMs: number;
};

/**
 * Final Pass Transcription
 * Transcribes detected speech segments using Whisper Base or Small.
 * Splits segments longer than 30 seconds (Whisper's maximum audio context window).
 */
export async function runFinalTranscriptionPass(
  recordingId: string,
  speechSegments: VADSpeechSegment[],
  audioBuffer: Float32Array,
  whisperModel: any,
  sampleRate = 16000
): Promise<TranscriptSegment[]> {
  const finalSegments: TranscriptSegment[] = [];
  const maxSegmentLengthMs = 30000; // 30 seconds

  let segmentCounter = 0;

  for (const seg of speechSegments) {
    const durationMs = seg.endMs - seg.startMs;

    // Split segments > 30s into sub-windows
    const subSegments: { startMs: number; endMs: number }[] = [];
    if (durationMs > maxSegmentLengthMs) {
      let currentStart = seg.startMs;
      while (currentStart < seg.endMs) {
        const nextEnd = Math.min(currentStart + maxSegmentLengthMs, seg.endMs);
        subSegments.push({ startMs: currentStart, endMs: nextEnd });
        currentStart = nextEnd;
      }
    } else {
      subSegments.push(seg);
    }

    for (const sub of subSegments) {
      segmentCounter++;
      const startSample = Math.floor((sub.startMs / 1000) * sampleRate);
      const endSample = Math.floor((sub.endMs / 1000) * sampleRate);
      const slice = audioBuffer.subarray(startSample, Math.min(endSample, audioBuffer.length));

      let transcribedText = '';
      if (whisperModel && typeof whisperModel.transcribe === 'function') {
        try {
          const res = await whisperModel.transcribe(slice);
          transcribedText = typeof res === 'string' ? res : (res?.text || '');
        } catch (err: any) {
          logger.error('WhisperFinal', `Failed to transcribe segment ${segmentCounter}:`, err?.message || err);
        }
      } else {
        // Fallback for simulation / mock testing
        transcribedText = `[Transcribed audio from ${sub.startMs}ms to ${sub.endMs}ms]`;
      }

      if (transcribedText.trim().length > 0) {
        const segment: TranscriptSegment = {
          id: `s${segmentCounter}`,
          recordingId,
          startMs: sub.startMs,
          endMs: sub.endMs,
          text: transcribedText.trim(),
          source: 'final',
        };

        await insertSegment(segment);
        finalSegments.push(segment);
      }
    }
  }

  return finalSegments;
}
