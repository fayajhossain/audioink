import { Platform } from 'react-native';
import { Persona, RecordingType } from '../../types/fidelity';
import { StructuredNote, TranscriptSegment } from '../../types/recording';
import { generateStructuredNote } from './note-generator';

export interface LocalLLMProgress {
  stage: 'downloading' | 'loading' | 'generating' | 'verifying' | 'done';
  progress?: number;
  tokensGenerated?: number;
}

/**
 * Runs on-device LLM note synthesis with full memory lifecycle management:
 * 1. Resolves model configuration (Llama 3.2 1B by default)
 * 2. Creates background LLMChatSession
 * 3. Streams and validates structured JSON output with segment citations
 * 4. Verifies grounding against transcript segments
 * 5. Disposes model from native memory to prevent OOM
 */
export async function runLocalLLMNoteGeneration(
  recordingId: string,
  persona: Persona,
  recordingType: RecordingType,
  segments: TranscriptSegment[],
  onToken?: (token: string) => void,
  onProgress?: (progress: LocalLLMProgress) => void
): Promise<StructuredNote> {
  let session: any = null;

  if (Platform.OS !== 'web') {
    try {
      onProgress?.({ stage: 'loading' });
      /* eslint-disable-next-line @typescript-eslint/no-require-imports */
      const { models, createLLMChatSession } = require('react-native-executorch');

      // Use Llama 3.2 1B default quantized platform variant
      const modelConfig = models?.llm?.LLAMA3_2_1B?.DEFAULT || models?.llm?.LFM2_5_1_2B?.DEFAULT;

      if (modelConfig && typeof createLLMChatSession === 'function') {
        session = await createLLMChatSession(modelConfig, {
          initialMessages: [{ role: 'system', content: persona.systemPrompt }],
          generationConfig: {
            temperature: 0.2,
            maxNewTokens: 1024,
          },
        });
      }
    } catch (err) {
      console.warn('[LocalLLM] Native ExecuTorch LLM session not loaded (development mode):', err);
    }
  }

  try {
    onProgress?.({ stage: 'generating' });

    // Custom runner adapter to forward streaming tokens
    const runner = session
      ? {
          sendMessage: async (promptText: string) => {
            const turn = await session.sendMessage(promptText, (token: string) => {
              if (onToken) onToken(token);
            });
            const lastMsg = turn.messages?.[turn.messages.length - 1];
            return typeof lastMsg?.content === 'string' ? lastMsg.content : JSON.stringify(lastMsg?.content);
          },
        }
      : null;

    onProgress?.({ stage: 'verifying' });

    const note = await generateStructuredNote(
      recordingId,
      persona,
      recordingType,
      segments,
      runner,
      'Llama-3.2-1B-Instruct'
    );

    onProgress?.({ stage: 'done' });
    return note;
  } finally {
    // Crucial: Free native memory when note generation completes
    if (session && typeof session.dispose === 'function') {
      try {
        session.dispose();
        console.log('[LocalLLM] Native LLM session successfully disposed from RAM.');
      } catch (e) {
        console.warn('[LocalLLM] Error disposing LLM session:', e);
      }
    }
  }
}

