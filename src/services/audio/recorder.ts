import { Platform } from 'react-native';
import { getRecordingAudioPath } from '../storage/audio-storage';
import { insertPause, updateRecordingStatus } from '../storage/database';

export type AudioChunkHandler = (pcmChunk: Float32Array, sampleOffset: number) => void;
export type LiveTranscriptHandler = (committedText: string, nonCommittedText: string) => void;

interface ActiveRecordingSession {
  recordingId: string;
  audioPath: string;
  samplesRecorded: number;
  lastClauseSampleOffset: number;
  pauseStartedAtMs: number | null;
  pauseStartSampleOffset: number | null;
  audioRecorder: any; // AudioRecorder instance
  isRecording: boolean;
  isPaused: boolean;
}

let activeSession: ActiveRecordingSession | null = null;

/**
 * Starts recording 16 kHz mono Float32 audio.
 * Hooks into live chunk stream and continuous disk spooling.
 */
export async function startRecordingSession(
  recordingId: string,
  onAudioChunk: AudioChunkHandler,
  onError?: (err: Error) => void
): Promise<string> {
  if (activeSession && activeSession.isRecording) {
    throw new Error('A recording session is already active');
  }

  const audioPath = await getRecordingAudioPath(recordingId);

  // In native environment, initialize AudioRecorder from react-native-audio-api
  let AudioRecorderClass: any = null;
  if (Platform.OS !== 'web') {
    try {
      /* eslint-disable-next-line @typescript-eslint/no-require-imports */
      const audioApi = require('react-native-audio-api');
      AudioRecorderClass = audioApi.AudioRecorder;
    } catch (e) {
      console.warn('[Recorder] Failed to load react-native-audio-api, fallback mode enabled:', e);
    }
  }

  const session: ActiveRecordingSession = {
    recordingId,
    audioPath,
    samplesRecorded: 0,
    lastClauseSampleOffset: 0,
    pauseStartedAtMs: null,
    pauseStartSampleOffset: null,
    audioRecorder: AudioRecorderClass ? new AudioRecorderClass() : null,
    isRecording: true,
    isPaused: false,
  };

  activeSession = session;

  if (session.audioRecorder) {
    try {
      // Configure 16 kHz mono Float32 audio buffer callbacks
      session.audioRecorder.onAudioReady(
        { sampleRate: 16000, channelCount: 1, bufferLength: 4096 },
        (event: any) => {
          if (!activeSession || !activeSession.isRecording || activeSession.isPaused) return;

          const channelData: Float32Array = event.buffer?.getChannelData
            ? event.buffer.getChannelData(0)
            : new Float32Array(event.numFrames || 0);

          const sampleOffset = activeSession.samplesRecorded;
          activeSession.samplesRecorded += channelData.length;

          // Dispatch chunk to ExecuTorch streamInsert & file spooler
          onAudioChunk(channelData, sampleOffset);
        }
      );

      session.audioRecorder.onError((err: any) => {
        console.error('[Recorder] Audio recording error:', err);
        if (onError) onError(new Error(err?.message || 'Recording error'));
      });

      await session.audioRecorder.start();
    } catch (err: any) {
      activeSession = null;
      throw new Error(`Failed to start native audio recorder: ${err?.message || err}`);
    }
  } else {
    console.log('[Recorder] Development/Simulated recording session started for:', recordingId);
  }

  return audioPath;
}

/**
 * Explicit pause of the current recording session
 */
export async function pauseRecordingSession(): Promise<void> {
  if (!activeSession || !activeSession.isRecording || activeSession.isPaused) return;

  activeSession.isPaused = true;
  activeSession.pauseStartedAtMs = Date.now();
  activeSession.pauseStartSampleOffset = activeSession.samplesRecorded;

  if (activeSession.audioRecorder && typeof activeSession.audioRecorder.pause === 'function') {
    try {
      await activeSession.audioRecorder.pause();
    } catch (e) {
      console.warn('[Recorder] Native audio recorder pause error:', e);
    }
  }
}

/**
 * Explicit resume of the current recording session
 */
export async function resumeRecordingSession(): Promise<void> {
  if (!activeSession || !activeSession.isRecording || !activeSession.isPaused) return;

  const now = Date.now();
  if (activeSession.pauseStartedAtMs !== null && activeSession.pauseStartSampleOffset !== null) {
    const pauseDuration = now - activeSession.pauseStartedAtMs;
    const pauseStartMs = Math.round((activeSession.pauseStartSampleOffset / 16000) * 1000);

    // Persist pause marker to database
    try {
      await insertPause({
        id: `pause_${now}`,
        recordingId: activeSession.recordingId,
        startMs: pauseStartMs,
        lengthMs: pauseDuration,
      });
    } catch (e) {
      console.warn('[Recorder] Failed to persist pause marker:', e);
    }
  }

  activeSession.isPaused = false;
  activeSession.pauseStartedAtMs = null;
  activeSession.pauseStartSampleOffset = null;

  if (activeSession.audioRecorder && typeof activeSession.audioRecorder.resume === 'function') {
    try {
      await activeSession.audioRecorder.resume();
    } catch (e) {
      console.warn('[Recorder] Native audio recorder resume error:', e);
    }
  }
}

/**
 * Handle system interruption (phone call, alarm)
 */
export async function handleRecordingInterruption(interruptionBegan: boolean, recordingId: string): Promise<void> {
  if (!activeSession || activeSession.recordingId !== recordingId) return;

  if (interruptionBegan) {
    await pauseRecordingSession();
  } else {
    await resumeRecordingSession();
  }
}

/**
 * Stops the active recording session and returns duration in ms.
 */
export async function stopRecordingSession(): Promise<{ recordingId: string; durationMs: number; audioPath: string }> {
  if (!activeSession) {
    throw new Error('No active recording session to stop');
  }

  const session = activeSession;
  session.isRecording = false;

  if (session.audioRecorder) {
    try {
      if (typeof session.audioRecorder.clearOnAudioReady === 'function') {
        session.audioRecorder.clearOnAudioReady();
      }
      await session.audioRecorder.stop();
    } catch (e) {
      console.warn('[Recorder] Error while stopping audio recorder:', e);
    }
  }

  const durationMs = Math.round((session.samplesRecorded / 16000) * 1000);
  await updateRecordingStatus(session.recordingId, 'ready', durationMs);

  activeSession = null;

  return {
    recordingId: session.recordingId,
    durationMs,
    audioPath: session.audioPath,
  };
}

export function isSessionRecording(): boolean {
  return !!activeSession && activeSession.isRecording;
}

export function isSessionPaused(): boolean {
  return !!activeSession && activeSession.isPaused;
}
