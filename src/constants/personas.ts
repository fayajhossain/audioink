import { Persona } from '../types/fidelity';

export const BUILT_IN_PERSONAS: Record<string, Persona> = {
  professor: {
    id: 'professor',
    name: 'Professor',
    systemPrompt:
      'You are an academic transcription assistant. Transform lecture and academic audio transcripts into clear, structured study notes. Emphasize key concepts, rigorous definitions, contextual examples, and follow-up discussion points. Ensure every key claim references its source transcript segment ID [sX].',
    vocabulary: [
      'pedagogy',
      'epistemology',
      'heuristics',
      'paradigm',
      'methodology',
      'hypothesis',
      'empirical',
    ],
    recordingTypes: [
      {
        id: 'lecture',
        label: 'Lecture',
        fidelity: {
          keepRepetitions: false,
          pauseMarkerMs: null, // Ignore pauses in lectures
          timestamps: 'paragraph',
          speakerLabels: false,
          keepAudio: 'until-approved',
        },
        noteSections: ['Summary', 'Core Concepts', 'Examples & Case Studies', 'Discussion & Next Steps'],
      },
      {
        id: 'office-hours',
        label: 'Office Hours',
        fidelity: {
          keepRepetitions: true,
          pauseMarkerMs: 1000, // Mark pauses >= 1s
          timestamps: 'segment',
          speakerLabels: true,
          keepAudio: 'until-approved',
        },
        noteSections: ['Student Inquiries', 'Clarifications & Guidance', 'Assigned Follow-ups'],
      },
      {
        id: 'oral-exam',
        label: 'Oral Examination',
        fidelity: {
          keepRepetitions: true,
          pauseMarkerMs: 1000,
          timestamps: 'segment',
          speakerLabels: true,
          keepAudio: 'until-approved',
        },
        noteSections: ['Questions Posed', 'Student Responses', 'Evaluation Notes'],
      },
    ],
    exports: ['md', 'pdf', 'txt'],
  },

  musician: {
    id: 'musician',
    name: 'Musician',
    systemPrompt:
      'You are a songwriting and music composition assistant. Preserve musical phrasing, cadence, lyrical ideas, tempo cues, and spontaneous riff descriptions verbatim. The audio is the ultimate source of truth; link all ideas back to source segment IDs [sX].',
    vocabulary: [
      'crescendo',
      'arpeggio',
      'syncopation',
      'tempo',
      'cadence',
      'staccato',
      'vamp',
      'hook',
      'bridge',
    ],
    recordingTypes: [
      {
        id: 'idea-capture',
        label: 'Idea Capture',
        fidelity: {
          keepRepetitions: true,
          pauseMarkerMs: 400, // Mark pauses >= 400ms for musical pauses
          timestamps: 'segment',
          speakerLabels: false,
          keepAudio: 'always',
        },
        noteSections: ['Melodic & Harmonic Ideas', 'Rhythmic Motifs', 'Arrangement Notes'],
      },
      {
        id: 'lyric-draft',
        label: 'Lyric Draft',
        fidelity: {
          keepRepetitions: true,
          pauseMarkerMs: 400,
          timestamps: 'segment',
          speakerLabels: false,
          keepAudio: 'always',
        },
        noteSections: ['Lyrical Lines & Drafts', 'Rhyme & Meter Concepts', 'Song Themes'],
      },
    ],
    exports: ['md', 'txt'],
  },

  lawyer: {
    id: 'lawyer',
    name: 'Lawyer',
    systemPrompt:
      'You are a legal assistant specializing in high-precision case notes and dictations. Maintain strict accuracy, factual integrity, and exact references to legal statutes, dates, and names. Every single assertion must cite the exact transcript segment ID [sX]. Flag any uncertain assertions.',
    vocabulary: [
      'plaintiff',
      'defendant',
      'deposition',
      'jurisdiction',
      'affidavit',
      'subpoena',
      'precedent',
      'tort',
      'indemnity',
    ],
    recordingTypes: [
      {
        id: 'dictation',
        label: 'Dictation',
        fidelity: {
          keepRepetitions: false,
          pauseMarkerMs: null, // Clean view for formal dictation
          timestamps: 'paragraph',
          speakerLabels: false,
          keepAudio: 'until-approved',
        },
        noteSections: ['Case Reference', 'Statement of Facts', 'Legal Analysis', 'Action Items & Filings'],
      },
      {
        id: 'client-meeting',
        label: 'Client Meeting',
        fidelity: {
          keepRepetitions: true,
          pauseMarkerMs: 1000,
          timestamps: 'segment',
          speakerLabels: true,
          keepAudio: 'until-approved',
        },
        noteSections: ['Attendees', 'Client Disclosures', 'Legal Strategy Discussed', 'Next Steps'],
      },
      {
        id: 'deposition',
        label: 'Deposition',
        fidelity: {
          keepRepetitions: true,
          pauseMarkerMs: 1000,
          timestamps: 'segment',
          speakerLabels: true,
          keepAudio: 'always',
        },
        noteSections: ['Deponent Details', 'Key Admissions & Testimony', 'Objections Raised', 'Exhibits Referenced'],
      },
    ],
    exports: ['md', 'pdf', 'txt'],
  },

  researcher: {
    id: 'researcher',
    name: 'Researcher',
    systemPrompt:
      'You are a qualitative and scientific research assistant. Produce disciplined research summaries from field recordings and participant interviews. Distinguish observed data from analytical interpretation. Ensure all findings cite transcript segments [sX].',
    vocabulary: [
      'qualitative',
      'quantitative',
      'triangulation',
      'phenomenology',
      'ethnography',
      'cohort',
      'correlation',
    ],
    recordingTypes: [
      {
        id: 'field-notes',
        label: 'Field Notes',
        fidelity: {
          keepRepetitions: false,
          pauseMarkerMs: null,
          timestamps: 'paragraph',
          speakerLabels: false,
          keepAudio: 'always',
        },
        noteSections: ['Context & Setting', 'Field Observations', 'Methodological Notes', 'Working Hypotheses'],
      },
      {
        id: 'interview',
        label: 'Interview',
        fidelity: {
          keepRepetitions: true,
          pauseMarkerMs: 1000,
          timestamps: 'segment',
          speakerLabels: true,
          keepAudio: 'always',
        },
        noteSections: ['Participant Background', 'Thematic Responses', 'Direct Quotes', 'Analytical Observations'],
      },
    ],
    exports: ['md', 'pdf', 'txt'],
  },
};

