export type TimestampMode = 'none' | 'paragraph' | 'segment';
export type AudioRetention = 'always' | 'until-approved' | 'never';

export type Fidelity = {
  keepRepetitions: boolean;
  pauseMarkerMs: number | null; // null = ignore pauses
  timestamps: TimestampMode;
  speakerLabels: boolean;
  keepAudio: AudioRetention;
};

export type RecordingType = {
  id: string; // e.g., "lecture", "office-hours", "idea-capture", "dictation"
  label: string;
  fidelity: Fidelity;
  noteSections: string[];
};

export type Persona = {
  id: string; // "professor" | "musician" | "lawyer" | "researcher"
  name: string;
  systemPrompt: string; // Instructions for how the LLM summarizes and structures notes
  vocabulary: string[]; // Specific terminology the LLM and renderer must spell exactly
  recordingTypes: RecordingType[];
  exports: ('md' | 'pdf' | 'txt')[];
};

