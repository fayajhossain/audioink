import { BUILT_IN_PERSONAS } from '../../constants/personas';
import { renderTranscript } from '../renderer';
import { energyBasedVADFallback } from '../../services/transcription/vad';
import { buildLLMPrompt, parseAndValidateLLMOutput, verifyNoteCitations } from '../../services/llm/note-generator';
import { TranscriptSegment } from '../../types/recording';

export function runE2EPipelineTest() {
  console.log('=== Running Full AudioInk End-to-End Pipeline Test ===\n');

  // Step 1: Synthesize a 6-second lecture audio stream
  const sampleRate = 16000;
  const waveform = new Float32Array(sampleRate * 6);

  // Clause 1: 0.5s - 2.5s (Tone)
  for (let i = 0.5 * sampleRate; i < 2.5 * sampleRate; i++) {
    waveform[i] = 0.2 * Math.sin(2 * Math.PI * 440 * (i / sampleRate));
  }
  // Pause: 2.5s - 4.0s (1.5s = 1500ms silence)
  // Clause 2: 4.0s - 5.5s (Tone)
  for (let i = 4.0 * sampleRate; i < 5.5 * sampleRate; i++) {
    waveform[i] = 0.25 * Math.sin(2 * Math.PI * 520 * (i / sampleRate));
  }

  console.log('1. Audio Stream Synthesized (6.0 seconds, 16kHz Float32 PCM)');

  // Step 2: Run VAD to extract speech segments and pause gaps
  const vadResult = energyBasedVADFallback(waveform, sampleRate);
  console.log(`2. VAD Detection Complete:`);
  console.log(`   - Detected ${vadResult.speechSegments.length} speech segments`);
  console.log(`   - Detected ${vadResult.pauses.length} pause gaps`);

  assert(vadResult.speechSegments.length === 2, 'Must detect 2 speech segments');
  assert(vadResult.pauses.length === 1, 'Must detect 1 pause gap');
  assert(vadResult.pauses[0].lengthMs >= 1200, 'Pause length should be ~1500ms');

  // Step 3: Transcription Segments
  const mockSegments: TranscriptSegment[] = [
    {
      id: 's1',
      recordingId: 'rec_test',
      startMs: vadResult.speechSegments[0].startMs,
      endMs: vadResult.speechSegments[0].endMs,
      text: 'I I think the primary epistemology of science requires empirical observation.',
      source: 'final',
    },
    {
      id: 's2',
      recordingId: 'rec_test',
      startMs: vadResult.speechSegments[1].startMs,
      endMs: vadResult.speechSegments[1].endMs,
      text: 'Therefore we formulate testable hypotheses.',
      source: 'final',
    },
  ];

  // Step 4: Persona Fidelity Rendering
  const professor = BUILT_IN_PERSONAS.professor;
  const lectureType = professor.recordingTypes[0];

  const cleanRendered = renderTranscript(mockSegments, vadResult.pauses, lectureType.fidelity, professor.vocabulary);
  console.log('\n3. Clean Rendering Output:');
  console.log(cleanRendered.fullText);

  assert(!cleanRendered.fullText.includes('I I think'), 'Clean view must collapse "I I" repetition');
  assert(cleanRendered.fullText.includes('epistemology'), 'Must preserve vocabulary');

  // Step 5: LLM Prompt Construction
  const prompt = buildLLMPrompt(professor, lectureType, mockSegments);
  console.log('\n4. LLM Prompt Generated:');
  console.log(prompt.slice(0, 180) + '...\n');
  assert(prompt.includes('[s1]'), 'Prompt must contain segment id [s1]');
  assert(prompt.includes('[s2]'), 'Prompt must contain segment id [s2]');

  // Step 6: Parse & Validate LLM Output
  const simulatedLLMResponse = JSON.stringify({
    sections: [
      {
        title: 'Summary',
        items: [{ text: 'Scientific epistemology is grounded in empirical observation.', src: ['s1'] }],
      },
      {
        title: 'Core Concepts',
        items: [{ text: 'Hypotheses must be testable through observation.', src: ['s2'] }],
      },
      {
        title: 'Examples & Case Studies',
        items: [{ text: 'Empirical testing methods.', src: ['s1', 's2'] }],
      },
      {
        title: 'Discussion & Next Steps',
        items: [{ text: 'Review scientific methodology.', src: ['s2'] }],
      },
    ],
  });

  const parsed = parseAndValidateLLMOutput(simulatedLLMResponse, lectureType.noteSections);
  assert(!parsed.error, `Parse error: ${parsed.error}`);
  assert(parsed.sections.length === 4, 'Must have 4 sections');

  // Step 7: Citation & Hallucination Verification
  const segsMap = new Map(mockSegments.map((s) => [s.id, s]));
  const verification = verifyNoteCitations(parsed.sections, segsMap);
  console.log('5. Citation Verification:');
  console.log(`   - Valid Citations: ${verification.valid}`);
  console.log(`   - Unverified Claims: ${verification.unverifiedClaims.length}`);

  assert(verification.valid, 'All citations should be valid');

  console.log('\n=== Full AudioInk E2E Pipeline Succeeded! ===\n');
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

runE2EPipelineTest();

