import { Fidelity } from './fidelity';

export type RecordingStatus = 'recording' | 'processing' | 'ready' | 'interrupted' | 'error';

export type SegmentSource = 'live' | 'final';

export type TranscriptSegment = {
  id: string; // e.g. "s1", "s2"
  recordingId: string;
  startMs: number;
  endMs: number;
  text: string;
  source: SegmentSource;
};

export type AudioPause = {
  id: string;
  recordingId: string;
  startMs: number;
  lengthMs: number;
};

export type Recording = {
  id: string;
  personaId: string;
  recordingTypeId: string;
  fidelityOverride?: Partial<Fidelity> | null;
  startTime: number;
  durationMs: number;
  audioPath: string;
  status: RecordingStatus;
  createdAt: string;
};

export type NoteSectionItem = {
  text: string;
  src: string[]; // Segment IDs referenced, e.g. ["s1", "s3"]
};

export type NoteSection = {
  title: string;
  items: NoteSectionItem[];
};

export type StructuredNote = {
  id: string;
  recordingId: string;
  sections: NoteSection[];
  rawSummary?: string;
  modelUsed: string;
  generatedTime: number;
  unverifiedClaims?: string[]; // Flagged facts/dates/numbers not found in source segments
};

