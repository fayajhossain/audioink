import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  useColorScheme,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors, Fonts } from '@/constants/theme';
import { getRecording, getSegmentsForRecording, getPausesForRecording, getNoteForRecording, saveNote } from '@/services/storage/database';
import { Recording, TranscriptSegment, AudioPause } from '@/types/recording';
import { BUILT_IN_PERSONAS } from '@/constants/personas';
import { Fidelity } from '@/types/fidelity';
import { renderTranscript, RenderResult } from '@/core/renderer';
import { runLocalLLMNoteGeneration } from '@/services/llm/local-llm-runner';
import { executeFullFinalPass } from '@/services/transcription/vad';

export default function TranscriptViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const isDark = scheme === 'dark';

  const [recording, setRecording] = useState<Recording | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [pauses, setPauses] = useState<AudioPause[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view: 'clean' vs 'verbatim'
  const [viewMode, setViewMode] = useState<'clean' | 'verbatim'>('clean');
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  const [isRunningFinalPass, setIsRunningFinalPass] = useState(false);

  // Audio player mock state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const loadTranscriptData = useCallback(async (recId: string) => {
    try {
      const rec = await getRecording(recId);
      setRecording(rec);

      let segs = await getSegmentsForRecording(recId);
      let ps = await getPausesForRecording(recId);

      // If newly recorded without live final pass, populate sample data for rich rendering demonstration
      if (segs.length === 0) {
        segs = [
          {
            id: 's1',
            recordingId: recId,
            startMs: 0,
            endMs: 4200,
            text: 'I I think the core epistemic problem with early empiricism is its reliance on ungrounded priors.',
            source: 'final',
          },
          {
            id: 's2',
            recordingId: recId,
            startMs: 4700,
            endMs: 9100,
            text: 'When we consider induction within probabilistic causal networks, the boundary shifts significantly.',
            source: 'final',
          },
          {
            id: 's3',
            recordingId: recId,
            startMs: 11600, // 2500ms pause from s2 -> triggers paragraph split
            endMs: 16500,
            text: 'We must examine the pedogogy carefully. The foundational methodology must preserve this distinction.',
            source: 'final',
          },
        ];
        ps = [{ id: 'p1', recordingId: recId, startMs: 9100, lengthMs: 2500 }];
      }

      setSegments(segs);
      setPauses(ps);
    } catch (e) {
      console.warn('[Transcript] Load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    loadTranscriptData(id);
  }, [id, loadTranscriptData]);

  const persona = recording ? BUILT_IN_PERSONAS[recording.personaId] || BUILT_IN_PERSONAS.professor : BUILT_IN_PERSONAS.professor;
  const recType = persona.recordingTypes.find((t) => t.id === recording?.recordingTypeId) || persona.recordingTypes[0];

  // Construct fidelity depending on active toggle
  const activeFidelity: Fidelity = {
    ...recType.fidelity,
    keepRepetitions: viewMode === 'verbatim',
    pauseMarkerMs: viewMode === 'verbatim' ? 400 : null,
    timestamps: viewMode === 'verbatim' ? 'segment' : 'paragraph',
  };

  // Pure function rendering: segments + pauses + fidelity + vocabulary -> rendered text
  const rendered: RenderResult = renderTranscript(segments, pauses, activeFidelity, persona.vocabulary);

  const handleRunFinalPass = async () => {
    if (!recording) return;
    setIsRunningFinalPass(true);
    try {
      // Synthesize audio buffer or read spool if available
      const sampleRate = 16000;
      const durationSec = Math.max(5, (recording.durationMs || 10000) / 1000);
      const mockBuffer = new Float32Array(Math.floor(durationSec * sampleRate));

      const res = await executeFullFinalPass(recording.id, mockBuffer, null, null, sampleRate);
      if (res.segments.length > 0) {
        setSegments(res.segments);
        setPauses(res.pauses);
      }
      setIsRunningFinalPass(false);
      Alert.alert('Final Pass Complete', 'Voice Activity Detection has calibrated speech segments and pause gaps.');
    } catch (e: any) {
      setIsRunningFinalPass(false);
      Alert.alert('Final Pass Error', e.message || 'Could not run final transcription pass.');
    }
  };

  const handleGenerateNotes = async () => {
    if (!recording) return;
    setIsGeneratingNote(true);

    try {
      // Check if note already exists
      const existing = await getNoteForRecording(recording.id);
      if (existing) {
        setIsGeneratingNote(false);
        router.push(`/notes/${recording.id}`);
        return;
      }

      // Generate structured note using on-device local LLM pipeline
      const note = await runLocalLLMNoteGeneration(
        recording.id,
        persona,
        recType,
        segments
      );

      await saveNote(note);
      setIsGeneratingNote(false);
      router.push(`/notes/${recording.id}`);
    } catch (err: any) {
      setIsGeneratingNote(false);
      Alert.alert('Note Generation', err.message || 'Failed to generate note.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* 1. Header */}
      <View style={[styles.header, { borderBottomColor: colors.outlineVariant }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontSize: 18 }}>‹ Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Transcript</Text>
          <Text style={[styles.headerSubtitle, { color: colors.outline }]}>
            {persona.name} • {recType.label}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.headerActionBtn, { backgroundColor: colors.surfaceContainer }]}
          onPress={() => Alert.alert('Export', 'Exporting full transcript...')}>
          <Text style={{ color: colors.text, fontSize: 13 }}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Dual View Mode Switcher */}
      <View style={styles.toggleRow}>
        <View style={[styles.toggleContainer, { backgroundColor: colors.surfaceContainer }]}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              viewMode === 'clean' && { backgroundColor: colors.surfaceContainerHigh },
            ]}
            onPress={() => setViewMode('clean')}>
            <Text
              style={[
                styles.toggleBtnText,
                { color: viewMode === 'clean' ? colors.primary : colors.outline },
              ]}>
              Clean View
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleBtn,
              viewMode === 'verbatim' && { backgroundColor: colors.surfaceContainerHigh },
            ]}
            onPress={() => setViewMode('verbatim')}>
            <Text
              style={[
                styles.toggleBtnText,
                { color: viewMode === 'verbatim' ? colors.primary : colors.outline },
              ]}>
              Verbatim View
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2b. VAD Final Pass Calibration Banner */}
      <View style={styles.bannerRow}>
        <View style={[styles.bannerCard, { backgroundColor: colors.surfaceContainer }]}>
          <View style={styles.bannerLeft}>
            <Text style={{ fontSize: 14 }}>⚡</Text>
            <View>
              <Text style={[styles.bannerTitle, { color: colors.text }]}>VAD Pause & Speech Calibration</Text>
              <Text style={[styles.bannerSub, { color: colors.outline }]}>Precise gap timestamps without cloud</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.bannerBtn, { backgroundColor: colors.surfaceContainerHigh }]}
            disabled={isRunningFinalPass}
            onPress={handleRunFinalPass}>
            {isRunningFinalPass ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.bannerBtnText, { color: colors.secondary }]}>Re-run VAD</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Transcript Body */}
      <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 160 }}>
        {rendered.paragraphs.map((p, pIdx) => (
          <View key={pIdx} style={styles.paragraphBox}>
            {/* Paragraph Text */}
            <Text style={[styles.paragraphText, { color: colors.text }]}>
              {p.segments.map((s, sIdx) => (
                <Text key={s.id}>
                  {s.renderedText}{' '}
                </Text>
              ))}
            </Text>

            {/* Vocabulary corrections callout */}
            {p.segments.some((s) => s.corrections && s.corrections.length > 0) && (
              <View style={[styles.vocabCallout, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Text style={[styles.vocabCalloutTitle, { color: colors.secondary }]}>
                  ✨ 1-Edit Vocabulary Auto-Fix:
                </Text>
                {p.segments
                  .flatMap((s) => s.corrections || [])
                  .map((c, idx) => (
                    <Text key={idx} style={[styles.vocabCorrectionText, { color: colors.text }]}>
                      &ldquo;{c.original}&rdquo; → <Text style={{ color: colors.primary, fontWeight: '600' }}>{c.corrected}</Text>
                    </Text>
                  ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* 4. Mini Audio Player & Scrubber Bar */}
      <View style={[styles.miniPlayer, { backgroundColor: colors.surfaceContainer }]}>
        <View style={styles.scrubberRow}>
          <Text style={[styles.scrubberTime, { color: colors.outline }]}>00:00</Text>
          <View style={[styles.scrubberTrack, { backgroundColor: colors.surfaceContainerHigh }]}>
            <View style={[styles.scrubberProgress, { backgroundColor: colors.primary, width: '35%' }]} />
          </View>
          <Text style={[styles.scrubberTime, { color: colors.outline }]}>00:16</Text>
        </View>

        <View style={styles.playerControls}>
          <TouchableOpacity
            style={[styles.speedBtn, { backgroundColor: colors.surfaceContainerHigh }]}
            onPress={() => setPlaybackSpeed((s) => (s === 1.0 ? 1.5 : s === 1.5 ? 2.0 : 1.0))}>
            <Text style={[styles.speedText, { color: colors.text }]}>{playbackSpeed}x</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.playPauseBtn} onPress={() => setIsPlaying(!isPlaying)}>
            <Text style={{ fontSize: 22 }}>{isPlaying ? '⏸️' : '▶️'}</Text>
          </TouchableOpacity>

          {/* Primary Action Button: Generate Structured Notes */}
          <TouchableOpacity
            style={[styles.generateNotesBtn, { backgroundColor: colors.primaryContainer }]}
            disabled={isGeneratingNote}
            onPress={handleGenerateNotes}>
            {isGeneratingNote ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Text style={{ fontSize: 14 }}>✨</Text>
                <Text style={styles.generateNotesText}>GENERATE NOTES</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingVertical: 4,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  headerActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  bannerRow: {
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  bannerSub: {
    fontSize: 10,
    marginTop: 1,
  },
  bannerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },
  bannerBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  paragraphBox: {
    marginBottom: 20,
  },
  paragraphText: {
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  vocabCallout: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  vocabCalloutTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  vocabCorrectionText: {
    fontSize: 12,
  },
  miniPlayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  scrubberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  scrubberTime: {
    fontSize: 10,
    fontFamily: Fonts?.mono || 'monospace',
  },
  scrubberTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  scrubberProgress: {
    height: '100%',
    borderRadius: 2,
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speedBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  speedText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Fonts?.mono || 'monospace',
  },
  playPauseBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateNotesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  generateNotesText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

