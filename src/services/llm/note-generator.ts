import { Persona, RecordingType } from '../../types/fidelity';
import { NoteSection, NoteSectionItem, StructuredNote, TranscriptSegment } from '../../types/recording';

export interface CitationVerificationResult {
  valid: boolean;
  unverifiedClaims: string[];
}

/**
 * Verifies that all cited segment IDs exist, and checks for hallucinated numbers or dates
 * that do not appear anywhere in the cited transcript source text.
 */
export function verifyNoteCitations(
  sections: NoteSection[],
  segmentsById: Map<string, TranscriptSegment>
): CitationVerificationResult {
  const unverifiedClaims: string[] = [];

  for (const section of sections) {
    for (const item of section.items) {
      // 1. Verify all cited segment IDs actually exist
      for (const srcId of item.src) {
        if (!segmentsById.has(srcId)) {
          unverifiedClaims.push(`[${section.title}] Referenced non-existent segment ID: ${srcId}`);
        }
      }

      // 2. Combine source text from cited segments
      const citedText = item.src
        .map((id) => segmentsById.get(id)?.text || '')
        .join(' ')
        .toLowerCase();

      // 3. Extract numbers and dates from generated text
      const numbersInItem = item.text.match(/\b\d+(\.\d+)?\b/g) || [];
      for (const num of numbersInItem) {
        // Exclude common citation formatting numbers like s1, s2
        if (!citedText.includes(num)) {
          unverifiedClaims.push(
            `[${section.title}] Potential hallucination: Number "${num}" in "${item.text}" was not found in cited segments (${item.src.join(', ')})`
          );
        }
      }
    }
  }

  return {
    valid: unverifiedClaims.length === 0,
    unverifiedClaims,
  };
}

/**
 * Builds the LLM input prompt containing the persona's instructions, required sections,
 * vocabulary terms, and the transcript with inline segment IDs.
 */
export function buildLLMPrompt(
  persona: Persona,
  recordingType: RecordingType,
  segments: TranscriptSegment[]
): string {
  const sectionsList = recordingType.noteSections.map((s) => `"${s}"`).join(', ');
  const vocabList = persona.vocabulary.join(', ');

  const transcriptLines = segments
    .map((s) => `[${s.id}] ${s.text}`)
    .join('\n');

  return `
You are generating structured notes for the persona "${persona.name}" and recording type "${recordingType.label}".

VOCABULARY REQUIREMENTS:
Spell these specific terms accurately: ${vocabList}.

REQUIRED NOTE SECTIONS:
Produce JSON containing strictly an array of sections with the following titles: [${sectionsList}].

FORMAT SPECIFICATION:
Respond with ONLY valid JSON adhering to this exact schema (no markdown formatting, no code fences):
{
  "sections": [
    {
      "title": "Section Title",
      "items": [
        {
          "text": "Key statement or summary point.",
          "src": ["s1", "s2"]
        }
      ]
    }
  ]
}

CRITICAL RULES:
1. Every claim must cite the exact transcript segment IDs in the "src" array (e.g. ["s1", "s2"]).
2. Never invent dates, numbers, facts, or entities not mentioned in the cited segments.
3. Every required section title must be present.

TRANSCRIPT WITH SEGMENT IDS:
${transcriptLines}
`.trim();
}

/**
 * Parses and validates LLM output JSON
 */
export function parseAndValidateLLMOutput(
  rawOutput: string,
  requiredSectionTitles: string[]
): { sections: NoteSection[]; error?: string } {
  try {
    // Strip possible markdown fences like ```json ... ```
    let cleanJson = rawOutput.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    const parsed = JSON.parse(cleanJson);
    if (!parsed || !Array.isArray(parsed.sections)) {
      return { sections: [], error: 'Root property "sections" must be an array' };
    }

    const validatedSections: NoteSection[] = [];
    for (const rawSec of parsed.sections) {
      if (typeof rawSec.title !== 'string') continue;

      const items: NoteSectionItem[] = [];
      if (Array.isArray(rawSec.items)) {
        for (const rawItem of rawSec.items) {
          if (typeof rawItem.text === 'string') {
            const src = Array.isArray(rawItem.src) ? rawItem.src.map(String) : [];
            items.push({ text: rawItem.text, src });
          }
        }
      }

      validatedSections.push({ title: rawSec.title, items });
    }

    return { sections: validatedSections };
  } catch (err: any) {
    return { sections: [], error: `JSON parse error: ${err.message}` };
  }
}

/**
 * Generates structured notes from transcript segments using an LLM session or runner.
 */
export async function generateStructuredNote(
  recordingId: string,
  persona: Persona,
  recordingType: RecordingType,
  segments: TranscriptSegment[],
  llmSession: any, // ExecuTorch LLMChatSession
  modelName = 'Llama-3.2-1B'
): Promise<StructuredNote> {
  const segmentsById = new Map<string, TranscriptSegment>();
  segments.forEach((s) => segmentsById.set(s.id, s));

  const prompt = buildLLMPrompt(persona, recordingType, segments);

  let rawOutput = '';
  if (llmSession && typeof llmSession.sendMessage === 'function') {
    try {
      rawOutput = await llmSession.sendMessage(prompt);
    } catch (e: any) {
      console.warn('[NoteGenerator] LLM session sendMessage error:', e);
    }
  } else {
    // Fallback template when LLM model is not loaded (or in development)
    rawOutput = JSON.stringify({
      sections: recordingType.noteSections.map((title) => ({
        title,
        items: [
          {
            text: `Summary statement for ${title}.`,
            src: segments.length > 0 ? [segments[0].id] : [],
          },
        ],
      })),
    });
  }

  const { sections, error } = parseAndValidateLLMOutput(rawOutput, recordingType.noteSections);

  let finalSections = sections;
  let rawSummary: string | undefined;

  if (error || sections.length === 0) {
    console.warn(`[NoteGenerator] Failed to produce valid structured JSON (${error}), falling back to plain summary`);
    rawSummary = rawOutput;
    finalSections = recordingType.noteSections.map((title) => ({
      title,
      items: [{ text: `Generated content for ${title}`, src: [] }],
    }));
  }

  // Citation verification
  const verification = verifyNoteCitations(finalSections, segmentsById);

  return {
    id: `note_${recordingId}`,
    recordingId,
    sections: finalSections,
    rawSummary,
    modelUsed: modelName,
    generatedTime: Date.now(),
    unverifiedClaims: verification.unverifiedClaims.length > 0 ? verification.unverifiedClaims : undefined,
  };
}

