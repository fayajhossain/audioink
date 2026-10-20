import { Platform } from 'react-native';
import { Persona, RecordingType } from '../../types/fidelity';
import { StructuredNote, TranscriptSegment } from '../../types/recording';
import { generateStructuredNote } from './note-generator';
import { logger } from '../logger';

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
      logger.info('LocalLLM', 'Loading ExecuTorch LLM session (Llama 3.2 1B)...');
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
        logger.info('LocalLLM', 'Native LLM session initialized successfully.');
      } else {
        logger.warn('LocalLLM', 'ExecuTorch modelConfig or createLLMChatSession unavailable; using simulated engine.');
      }
    } catch (err: any) {
      logger.warn('LocalLLM', 'Native ExecuTorch LLM session failed to load:', err?.message || err);
    }
  }

  try {
    onProgress?.({ stage: 'generating' });
    logger.info('LocalLLM', `Generating structured note for recording ${recordingId} (segments: ${segments.length})`);

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

    if (note.unverifiedClaims && note.unverifiedClaims.length > 0) {
      logger.warn('LocalLLM', `Grounding verification flagged ${note.unverifiedClaims.length} unverified claim(s).`, note.unverifiedClaims);
    } else {
      logger.info('LocalLLM', 'All claims 100% grounded against transcript segments.');
    }

    onProgress?.({ stage: 'done' });
    return note;
  } catch (genError: any) {
    logger.error('LocalLLM', 'Error during LLM note generation:', genError?.message || genError);
    throw genError;
  } finally {
    // Crucial: Free native memory when note generation completes
    if (session && typeof session.dispose === 'function') {
      try {
        session.dispose();
        logger.info('LocalLLM', 'Native LLM session successfully disposed from RAM to prevent OOM.');
      } catch (e: any) {
        logger.warn('LocalLLM', 'Error disposing LLM session:', e?.message || e);
      }
    }
  }
}

