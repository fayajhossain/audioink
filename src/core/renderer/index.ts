import { Fidelity } from '../../types/fidelity';
import { AudioPause, TranscriptSegment } from '../../types/recording';

export type RenderedSegment = {
  id: string;
  originalText: string;
  renderedText: string;
  timestampStr?: string;
  corrections?: { original: string; corrected: string }[];
};

export type RenderedParagraph = {
  segments: RenderedSegment[];
  text: string;
  pauseBeforeMs?: number;
};

export type RenderResult = {
  paragraphs: RenderedParagraph[];
  fullText: string;
};

/**
 * Format milliseconds into a human-readable mm:ss or hh:mm:ss timestamp
 */
export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `[${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`;
  }
  return `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1].toLowerCase() === b[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Collapses adjacent 1 to 3 word exact repeats in clean mode.
 * Example: "I I think" -> "I think"
 * Example: "we will we will test this" -> "we will test this"
 */
export function collapseAdjacentWordRepeats(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= 1) return text;

  let changed = true;
  let currentWords = [...words];

  // Check repetition pattern of lengths 1, 2, and 3 words
  while (changed) {
    changed = false;
    for (let len = 3; len >= 1; len--) {
      for (let i = 0; i <= currentWords.length - 2 * len; i++) {
        const slice1 = currentWords.slice(i, i + len).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''));
        const slice2 = currentWords.slice(i + len, i + 2 * len).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''));

        if (slice1.every((w, idx) => w.length > 0 && w === slice2[idx])) {
          // Collapse: remove the second repeated group
          currentWords.splice(i + len, len);
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }

  return currentWords.join(' ');
}

/**
 * Apply conservative 1-edit distance corrections against persona vocabulary
 */
export function applyVocabularyCorrection(
  text: string,
  vocabulary: string[]
): { text: string; corrections: { original: string; corrected: string }[] } {
  if (!vocabulary || vocabulary.length === 0) {
    return { text, corrections: [] };
  }

  const corrections: { original: string; corrected: string }[] = [];
  const words = text.split(/(\s+|[.,!?;:()]+)/);

  const correctedWords = words.map((token) => {
    // Only check alphanumeric words >= 4 chars
    const cleanWord = token.replace(/[^a-zA-Z0-9]/g, '');
    if (cleanWord.length < 4) return token;

    for (const term of vocabulary) {
      if (cleanWord.toLowerCase() === term.toLowerCase()) {
        return token; // Exact match, keep
      }
      const dist = levenshteinDistance(cleanWord, term);
      if (dist === 1) {
        corrections.push({ original: token, corrected: term });
        return token.replace(cleanWord, term);
      }
    }
    return token;
  });

  return { text: correctedWords.join(''), corrections };
}

/**
 * Pure Fidelity Renderer
 * Given transcript segments, audio pauses, fidelity settings, and optional vocabulary,
 * outputs structured rendered paragraphs and plain text.
 */
export function renderTranscript(
  segments: TranscriptSegment[],
  pauses: AudioPause[],
  fidelity: Fidelity,
  vocabulary: string[] = []
): RenderResult {
  if (!segments || segments.length === 0) {
    return { paragraphs: [], fullText: '' };
  }

  // Sort segments chronologically
  const sortedSegments = [...segments].sort((a, b) => a.startMs - b.startMs);

  // Group segments into paragraphs.
  // In clean mode, a pause >= 2000ms triggers a new paragraph.
  const paragraphsData: { segments: TranscriptSegment[]; pauseBeforeMs?: number }[] = [];
  let currentGroup: TranscriptSegment[] = [];

  for (let i = 0; i < sortedSegments.length; i++) {
    const seg = sortedSegments[i];
    if (i === 0) {
      currentGroup.push(seg);
      continue;
    }

    const prevSeg = sortedSegments[i - 1];
    const gap = seg.startMs - prevSeg.endMs;

    // Check if there is a detected pause between these segments >= 2000ms
    const isLongPause = gap >= 2000;

    if (isLongPause) {
      paragraphsData.push({ segments: currentGroup, pauseBeforeMs: gap });
      currentGroup = [seg];
    } else {
      currentGroup.push(seg);
    }
  }

  if (currentGroup.length > 0) {
    paragraphsData.push({ segments: currentGroup });
  }

  // Render paragraphs based on fidelity
  const renderedParagraphs: RenderedParagraph[] = paragraphsData.map((pData, pIdx) => {
    const renderedSegments: RenderedSegment[] = pData.segments.map((seg, sIdx) => {
      let text = seg.text.trim();
      let corrections: { original: string; corrected: string }[] | undefined;

      if (!fidelity.keepRepetitions) {
        text = collapseAdjacentWordRepeats(text);
        const vocabRes = applyVocabularyCorrection(text, vocabulary);
        text = vocabRes.text;
        corrections = vocabRes.corrections.length > 0 ? vocabRes.corrections : undefined;
      }

      // Check if we need to insert pause markers before this segment in verbatim mode
      let prefix = '';
      if (fidelity.pauseMarkerMs !== null && sIdx > 0) {
        const prev = pData.segments[sIdx - 1];
        const gapMs = seg.startMs - prev.endMs;
        if (gapMs >= fidelity.pauseMarkerMs) {
          const pauseSec = (gapMs / 1000).toFixed(1);
          prefix = `[pause ${pauseSec}s] `;
        }
      }

      let timestampStr: string | undefined;
      if (fidelity.timestamps === 'segment') {
        timestampStr = formatTimestamp(seg.startMs);
      } else if (fidelity.timestamps === 'paragraph' && sIdx === 0) {
        timestampStr = formatTimestamp(seg.startMs);
      }

      const segmentText = `${prefix}${timestampStr ? `${timestampStr} ` : ''}${text}`;

      return {
        id: seg.id,
        originalText: seg.text,
        renderedText: segmentText,
        timestampStr,
        corrections,
      };
    });

    const paragraphText = renderedSegments.map((s) => s.renderedText).join(' ');

    return {
      segments: renderedSegments,
      text: paragraphText,
      pauseBeforeMs: pData.pauseBeforeMs,
    };
  });

  const fullText = renderedParagraphs.map((p) => p.text).join('\n\n');

  return {
    paragraphs: renderedParagraphs,
    fullText,
  };
}

