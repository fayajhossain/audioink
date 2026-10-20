import {
  collapseAdjacentWordRepeats,
  applyVocabularyCorrection,
  renderTranscript,
  formatTimestamp,
} from '../index';
import { TranscriptSegment } from '../../../types/recording';
import { Fidelity } from '../../../types/fidelity';

export function runRendererTests() {
  console.log('--- Running AudioInk Renderer Tests ---');

  // Test 1: formatTimestamp
  assert(formatTimestamp(65000) === '[01:05]', 'Timestamp mm:ss formatting failed');
  assert(formatTimestamp(3665000) === '[01:01:05]', 'Timestamp hh:mm:ss formatting failed');
  console.log('✓ formatTimestamp passed');

  // Test 2: Word repetition collapsing
  const collapsed1 = collapseAdjacentWordRepeats('I I think we should proceed');
  assert(collapsed1 === 'I think we should proceed', `Failed: ${collapsed1}`);

  const collapsed2 = collapseAdjacentWordRepeats('we will we will test this now');
  assert(collapsed2 === 'we will test this now', `Failed: ${collapsed2}`);

  const collapsed3 = collapseAdjacentWordRepeats('no repetition here');
  assert(collapsed3 === 'no repetition here', `Failed: ${collapsed3}`);
  console.log('✓ collapseAdjacentWordRepeats passed');

  // Test 3: Vocabulary correction
  const vocab = ['jurisdiction', 'epistemology', 'pedagogy'];
  const vocabRes = applyVocabularyCorrection('The court lacks jurisdction over this matter', vocab);
  assert(vocabRes.text.includes('jurisdiction'), `Failed vocab fix: ${vocabRes.text}`);
  assert(vocabRes.corrections.length === 1, 'Expected 1 correction');
  console.log('✓ applyVocabularyCorrection passed');

  // Test 4: Clean vs Verbatim Rendering
  const mockSegments: TranscriptSegment[] = [
    { id: 's1', recordingId: 'rec1', startMs: 0, endMs: 2000, text: 'I I believe this is critical', source: 'final' },
    { id: 's2', recordingId: 'rec1', startMs: 2500, endMs: 4000, text: 'We must examine the pedagogy', source: 'final' },
    // Long pause of 2500ms (end: 4000 to start: 6500)
    { id: 's3', recordingId: 'rec1', startMs: 6500, endMs: 8000, text: 'Now moving on to chapter two', source: 'final' },
  ];

  const cleanFidelity: Fidelity = {
    keepRepetitions: false,
    pauseMarkerMs: null,
    timestamps: 'paragraph',
    speakerLabels: false,
    keepAudio: 'until-approved',
  };

  const verbatimFidelity: Fidelity = {
    keepRepetitions: true,
    pauseMarkerMs: 400,
    timestamps: 'segment',
    speakerLabels: true,
    keepAudio: 'always',
  };

  // Test clean rendering
  const cleanResult = renderTranscript(mockSegments, [], cleanFidelity, ['pedagogy']);
  assert(cleanResult.paragraphs.length === 2, `Expected 2 paragraphs on 2.5s pause, got ${cleanResult.paragraphs.length}`);
  assert(cleanResult.fullText.includes('I believe'), 'Clean view should collapse "I I"');
  assert(!cleanResult.fullText.includes('[pause'), 'Clean view should not include [pause]');
  console.log('✓ Clean rendering passed');

  // Test verbatim rendering
  const verbatimResult = renderTranscript(mockSegments, [], verbatimFidelity);
  assert(verbatimResult.fullText.includes('I I believe'), 'Verbatim view must preserve repetitions');
  assert(verbatimResult.fullText.includes('[pause 0.5s]'), `Verbatim view must include pause marker for 500ms gap, got: ${verbatimResult.fullText}`);
  assert(verbatimResult.fullText.includes('[00:00]'), 'Verbatim view must include timestamps');
  console.log('✓ Verbatim rendering passed');

  console.log('--- All Renderer Tests Passed Successfully! ---\n');
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Run tests immediately when imported
runRendererTests();
