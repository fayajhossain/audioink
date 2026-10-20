import * as FileSystem from 'expo-file-system/legacy';
import { Paths } from 'expo-file-system';

const AUDIO_DIR_NAME = 'audio_recordings';

/**
 * Get or create the app-private audio recordings directory
 */
export async function getAudioDirectory(): Promise<string> {
  const baseDir = FileSystem.documentDirectory || '';
  const dirPath = `${baseDir}${AUDIO_DIR_NAME}/`;

  const info = await FileSystem.getInfoAsync(dirPath);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
  }
  return dirPath;
}

/**
 * Generates an audio spool file path for a recording
 */
export async function getRecordingAudioPath(recordingId: string): Promise<string> {
  const dir = await getAudioDirectory();
  return `${dir}${recordingId}.pcm`;
}

/**
 * Deletes the audio file associated with a recording (for privacy retention / cascade delete)
 */
export async function deleteAudioFile(path: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path, { idempotent: true });
    }
  } catch (error) {
    console.warn(`[AudioStorage] Failed to delete audio file at ${path}:`, error);
  }
}

/**
 * Returns available device storage space in bytes
 * Used to check storage before starting a recording or downloading a heavy model.
 */
export function getAvailableStorageBytes(): number {
  try {
    return Paths.availableDiskSpace || 0;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

