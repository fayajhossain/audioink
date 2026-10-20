import * as SQLite from 'expo-sqlite';
import { getOrCreateDatabaseEncryptionKey } from './secure-store';
import { deleteAudioFile } from './audio-storage';
import { AudioPause, Recording, StructuredNote, TranscriptSegment } from '../../types/recording';
import { logger } from '../logger';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function safeJsonParse<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString) as T;
  } catch (e: any) {
    logger.warn('Database', 'JSON parse failed, returning fallback:', e?.message);
    return fallback;
  }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = (async () => {
    logger.info('Database', 'Initializing SQLite database connection...');
    const key = await getOrCreateDatabaseEncryptionKey();
    const db = await SQLite.openDatabaseAsync('audioink.db');

    // Verify SQLCipher is active in native build
    try {
      const cipherCheck = await db.getFirstAsync<{ cipher_version?: string }>('PRAGMA cipher_version;');
      if (cipherCheck?.cipher_version) {
        // Enforce strict hex key validation to prevent any SQL injection in PRAGMA statement
        const sanitizedKey = key.replace(/[^0-9a-fA-F]/g, '');
        if (sanitizedKey.length > 0) {
          await db.execAsync(`PRAGMA key = '${sanitizedKey}';`);
          logger.info('Database', `SQLCipher active (v${cipherCheck.cipher_version}), AES-256 key applied.`);
        }
      } else {
        logger.warn('Database', 'Running without SQLCipher (development build or Expo Go fallback).');
      }
    } catch (err: any) {
      logger.error('Database', 'SQLCipher check encountered an exception; continuing.', err?.message);
    }

    // WAL journal mode for performance and foreign keys for cascade deletes
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // Initialize Schema
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recordings (
        id TEXT PRIMARY KEY,
        persona_id TEXT NOT NULL,
        recording_type_id TEXT NOT NULL,
        fidelity_override TEXT,
        start_time INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        audio_path TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS segments (
        id TEXT PRIMARY KEY,
        recording_id TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
        start_ms INTEGER NOT NULL,
        end_ms INTEGER NOT NULL,
        text TEXT NOT NULL,
        source TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pauses (
        id TEXT PRIMARY KEY,
        recording_id TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
        start_ms INTEGER NOT NULL,
        length_ms INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        recording_id TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
        note_json TEXT NOT NULL,
        model_used TEXT NOT NULL,
        generated_time INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS personas (
        id TEXT PRIMARY KEY,
        data_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    dbInstance = db;
    return dbInstance;
  })();

  try {
    return await dbInitPromise;
  } finally {
    dbInitPromise = null;
  }
}

// --- Recording Operations ---

export async function createRecording(rec: Recording): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO recordings (id, persona_id, recording_type_id, fidelity_override, start_time, duration_ms, audio_path, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    rec.id,
    rec.personaId,
    rec.recordingTypeId,
    rec.fidelityOverride ? JSON.stringify(rec.fidelityOverride) : null,
    rec.startTime,
    rec.durationMs,
    rec.audioPath,
    rec.status,
    rec.createdAt
  );
}

export async function updateRecordingStatus(id: string, status: Recording['status'], durationMs?: number): Promise<void> {
  const db = await getDatabase();
  if (durationMs !== undefined) {
    await db.runAsync(`UPDATE recordings SET status = ?, duration_ms = ? WHERE id = ?;`, status, durationMs, id);
  } else {
    await db.runAsync(`UPDATE recordings SET status = ? WHERE id = ?;`, status, id);
  }
}

export async function getRecording(id: string): Promise<Recording | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    persona_id: string;
    recording_type_id: string;
    fidelity_override: string | null;
    start_time: number;
    duration_ms: number;
    audio_path: string;
    status: Recording['status'];
    created_at: string;
  }>(`SELECT * FROM recordings WHERE id = ?;`, id);

  if (!row) return null;

  return {
    id: row.id,
    personaId: row.persona_id,
    recordingTypeId: row.recording_type_id,
    fidelityOverride: safeJsonParse(row.fidelity_override, undefined),
    startTime: row.start_time,
    durationMs: row.duration_ms,
    audioPath: row.audio_path,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function getAllRecordings(): Promise<Recording[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    persona_id: string;
    recording_type_id: string;
    fidelity_override: string | null;
    start_time: number;
    duration_ms: number;
    audio_path: string;
    status: Recording['status'];
    created_at: string;
  }>(`SELECT * FROM recordings ORDER BY start_time DESC;`);

  return rows.map((row) => ({
    id: row.id,
    personaId: row.persona_id,
    recordingTypeId: row.recording_type_id,
    fidelityOverride: safeJsonParse(row.fidelity_override, undefined),
    startTime: row.start_time,
    durationMs: row.duration_ms,
    audioPath: row.audio_path,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function deleteRecordingCascade(id: string): Promise<void> {
  const db = await getDatabase();
  // Clean up audio file on disk first
  const rec = await getRecording(id);
  if (rec?.audioPath) {
    await deleteAudioFile(rec.audioPath);
  }
  // FOREIGN KEY ON DELETE CASCADE cleans up segments, pauses, and notes
  await db.runAsync(`DELETE FROM recordings WHERE id = ?;`, id);
}

// --- Segment Operations ---

export async function insertSegment(seg: TranscriptSegment): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO segments (id, recording_id, start_ms, end_ms, text, source)
     VALUES (?, ?, ?, ?, ?, ?);`,
    seg.id,
    seg.recordingId,
    seg.startMs,
    seg.endMs,
    seg.text,
    seg.source
  );
}

export async function getSegmentsForRecording(recordingId: string): Promise<TranscriptSegment[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    recording_id: string;
    start_ms: number;
    end_ms: number;
    text: string;
    source: TranscriptSegment['source'];
  }>(`SELECT * FROM segments WHERE recording_id = ? ORDER BY start_ms ASC;`, recordingId);

  return rows.map((r) => ({
    id: r.id,
    recordingId: r.recording_id,
    startMs: r.start_ms,
    endMs: r.end_ms,
    text: r.text,
    source: r.source,
  }));
}

// --- Pause Operations ---

export async function insertPause(pause: AudioPause): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO pauses (id, recording_id, start_ms, length_ms) VALUES (?, ?, ?, ?);`,
    pause.id,
    pause.recordingId,
    pause.startMs,
    pause.lengthMs
  );
}

export async function getPausesForRecording(recordingId: string): Promise<AudioPause[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    recording_id: string;
    start_ms: number;
    length_ms: number;
  }>(`SELECT * FROM pauses WHERE recording_id = ? ORDER BY start_ms ASC;`, recordingId);

  return rows.map((r) => ({
    id: r.id,
    recordingId: r.recording_id,
    startMs: r.start_ms,
    lengthMs: r.length_ms,
  }));
}

// --- Note Operations ---

export async function saveNote(note: StructuredNote): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO notes (id, recording_id, note_json, model_used, generated_time)
     VALUES (?, ?, ?, ?, ?);`,
    note.id,
    note.recordingId,
    JSON.stringify(note),
    note.modelUsed,
    note.generatedTime
  );
}

export async function getNoteForRecording(recordingId: string): Promise<StructuredNote | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ note_json: string }>(
    `SELECT note_json FROM notes WHERE recording_id = ?;`,
    recordingId
  );
  if (!row) return null;
  return safeJsonParse(row.note_json, null);
}

// --- Crash Recovery ---

/**
 * On app startup, recover any recordings left in 'recording' or 'processing' status
 * due to OS kills, dead battery, or unexpected crashes.
 */
export async function recoverInterruptedRecordings(): Promise<number> {
  const db = await getDatabase();
  const res = await db.runAsync(
    `UPDATE recordings SET status = 'interrupted' WHERE status IN ('recording', 'processing');`
  );
  return res.changes;
}
