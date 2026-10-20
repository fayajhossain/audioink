import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  useColorScheme,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts } from '@/constants/theme';
import {
  startRecordingSession,
  stopRecordingSession,
  pauseRecordingSession,
  resumeRecordingSession,
  isSessionRecording,
} from '@/services/audio/recorder';
import { createRecording, deleteRecordingCascade } from '@/services/storage/database';
import { Persona, RecordingType } from '@/types/fidelity';
import { getActivePersona, getActiveRecordingType, subscribePersonaChange } from '@/services/persona-state';

export default function LiveRecordScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const isDark = scheme === 'dark';

  // Selected persona state (initialized from active persona store)
  const [selectedPersona, setSelectedPersona] = useState<Persona>(getActivePersona);
  const [selectedType, setSelectedType] = useState<RecordingType>(getActiveRecordingType);

  // Session state
  const [recordingId] = useState<string>(() => `rec_${Date.now()}`);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Live transcript state
  const [committedClauses, setCommittedClauses] = useState<{ id: string; text: string; timeOffset: string }[]>([]);
  const [currentDraft, setCurrentDraft] = useState<string>('Listening for speech...');

  // Visualizer animated bars
  const [waveformHeights, setWaveformHeights] = useState<number[]>([
    20, 35, 55, 80, 95, 60, 45, 25, 18, 40, 75, 100, 85, 60, 30, 20, 50, 85, 70, 50, 35, 20, 45, 65, 50, 25, 15,
  ]);

  const timerRef = useRef<any>(null);
  const demoTimer1Ref = useRef<any>(null);
  const demoTimer2Ref = useRef<any>(null);
  const accumulatedMsRef = useRef<number>(0);
  const lastResumeTimeRef = useRef<number>(0);

  const initiateRecording = useCallback(
    async (id: string, persona: Persona, recType: RecordingType) => {
      try {
        // 1. Create recording entry in SQLite database
        await createRecording({
          id,
          personaId: persona.id,
          recordingTypeId: recType.id,
          startTime: Date.now(),
          durationMs: 0,
          audioPath: '',
          status: 'recording',
          createdAt: new Date().toISOString(),
        });

        // 2. Start audio capture & spooling
        await startRecordingSession(
          id,
          (chunk) => {
            // Calculate audio level for waveform visualizer
            const stride = Math.max(1, Math.floor(chunk.length / 16));
            let sum = 0;
            let count = 0;
            for (let i = 0; i < chunk.length; i += stride) {
              sum += Math.abs(chunk[i]);
              count++;
            }
            const avg = count > 0 ? sum / count : 0;
            const scaledHeight = Math.min(100, Math.max(15, Math.round(avg * 400)));

            setWaveformHeights((prev) => [...prev.slice(1), scaledHeight]);
          },
          (error) => {
            Alert.alert('Recording Error', error.message);
          }
        );

        setIsRecording(true);

        // Start elapsed timer
        lastResumeTimeRef.current = Date.now();
        accumulatedMsRef.current = 0;
        timerRef.current = setInterval(() => {
          setElapsedMs(accumulatedMsRef.current + (Date.now() - lastResumeTimeRef.current));
        }, 100);

        // Simulated initial demo transcription stream for immediate feedback
        demoTimer1Ref.current = setTimeout(() => {
          setCommittedClauses((prev) => [
            ...prev,
            {
              id: 'c1',
              text: 'The core epistemic problem with early empiricism is its reliance on ungrounded priors.',
              timeOffset: '00:04',
            },
          ]);
          setCurrentDraft('When we consider induction within probabilistic causal networks...');
        }, 2500);

        demoTimer2Ref.current = setTimeout(() => {
          setCommittedClauses((prev) => [
            ...prev,
            {
              id: 'c2',
              text: 'When we consider induction within probabilistic causal networks, the boundary shifts.',
              timeOffset: '00:08',
            },
          ]);
          setCurrentDraft('The foundational methodology must preserve this distinction...');
        }, 6000);
      } catch (err: any) {
        console.error('[Record] Failed to start:', err);
        Alert.alert('Microphone Setup', err.message || 'Could not start audio recorder.');
      }
    },
    []
  );

  useEffect(() => {
    // Subscribe to persona changes if user modifies persona in modal
    const unsubscribePersona = subscribePersonaChange(() => {
      setSelectedPersona(getActivePersona());
      setSelectedType(getActiveRecordingType());
    });

    // Auto-start recording session
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    initiateRecording(recordingId, selectedPersona, selectedType);

    return () => {
      unsubscribePersona();
      if (timerRef.current) clearInterval(timerRef.current);
      if (demoTimer1Ref.current) clearTimeout(demoTimer1Ref.current);
      if (demoTimer2Ref.current) clearTimeout(demoTimer2Ref.current);
      if (isSessionRecording()) {
        stopRecordingSession().catch(console.warn);
      }
    };
  }, [recordingId, selectedPersona, selectedType, initiateRecording]);

  const handleTogglePause = async () => {
    if (isPaused) {
      await resumeRecordingSession();
      setIsPaused(false);
      lastResumeTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedMs(accumulatedMsRef.current + (Date.now() - lastResumeTimeRef.current));
      }, 100);
    } else {
      await pauseRecordingSession();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
      accumulatedMsRef.current += Date.now() - lastResumeTimeRef.current;
    }
  };

  const formatTimer = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const fraction = Math.floor((ms % 1000) / 10);
    return {
      timeStr: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
      fractionStr: `.${fraction.toString().padStart(2, '0')}`,
    };
  };

  const handleStopAndSave = async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      if (demoTimer1Ref.current) clearTimeout(demoTimer1Ref.current);
      if (demoTimer2Ref.current) clearTimeout(demoTimer2Ref.current);
      const res = await stopRecordingSession();
      // Navigate to transcript viewer for this recording
      router.replace(`/transcript/${res.recordingId}`);
    } catch (e: any) {
      console.warn('[Record] Stop error:', e);
      router.replace(`/transcript/${recordingId}`);
    }
  };

  const handleDiscard = () => {
    Alert.alert('Discard Recording?', 'The captured audio and draft transcript will not be saved.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          if (timerRef.current) clearInterval(timerRef.current);
          if (demoTimer1Ref.current) clearTimeout(demoTimer1Ref.current);
          if (demoTimer2Ref.current) clearTimeout(demoTimer2Ref.current);
          try {
            await stopRecordingSession();
          } catch {}
          try {
            await deleteRecordingCascade(recordingId);
          } catch {}
          router.back();
        },
      },
    ]);
  };

  const personaIcon =
    selectedPersona.id === 'professor'
      ? '🎓'
      : selectedPersona.id === 'musician'
      ? '🎵'
      : selectedPersona.id === 'lawyer'
      ? '⚖️'
      : '🔬';

  const timer = formatTimer(elapsedMs);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* 1. Top Security & Status Bar */}
      <View style={[styles.statusBar, { backgroundColor: colors.surfaceContainer }]}>
        <View style={styles.airgapPill}>
          <View style={[styles.pulseIndicator, { backgroundColor: colors.tertiary }]} />
          <Text style={[styles.airgapText, { color: colors.tertiary }]}>
            {isPaused ? 'PAUSED' : isRecording ? 'LIVE • ON-DEVICE' : 'INITIALIZING'}
          </Text>
        </View>

        {/* Monospace Timer */}
        <View style={styles.clockRow}>
          <View style={[styles.redDot, { backgroundColor: isPaused ? colors.outline : colors.error }]} />
          <Text style={[styles.timerMain, { color: colors.text }]}>{timer.timeStr}</Text>
          <Text style={[styles.timerSub, { color: colors.outline }]}>{timer.fractionStr}</Text>
        </View>

        {/* Hardware Encryption Badge */}
        <View style={[styles.encBadge, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Text style={{ fontSize: 10 }}>🔒</Text>
          <Text style={[styles.encText, { color: colors.secondary }]}>AES-256</Text>
        </View>
      </View>

      <ScrollView style={styles.mainContainer} contentContainerStyle={{ paddingBottom: 160 }}>
        {/* 2. Persona & Mode Selector */}
        <TouchableOpacity
          style={[styles.personaBar, { backgroundColor: colors.surfaceContainer }]}
          activeOpacity={0.8}
          onPress={() => router.push('/persona-modal')}>
          <View style={styles.personaLeft}>
            <Text style={{ fontSize: 18 }}>{personaIcon}</Text>
            <View>
              <View style={styles.personaTitleRow}>
                <Text style={[styles.personaTitle, { color: colors.text }]}>
                  {selectedPersona.name} • {selectedType.label}
                </Text>
                <Text style={{ color: colors.outline, fontSize: 12 }}>▾</Text>
              </View>
              <Text style={[styles.modelSubtitle, { color: colors.outline }]}>
                Fidelity: {selectedType.fidelity.keepRepetitions ? 'Verbatim' : 'Clean'}
              </Text>
            </View>
          </View>

          <View style={[styles.modeBadge, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Text style={[styles.modeBadgeText, { color: colors.secondary }]}>
              {selectedType.fidelity.keepRepetitions ? 'Verbatim View' : 'Clean Summary'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 3. Waveform Audio Visualizer */}
        <View style={[styles.visualizerCard, { backgroundColor: colors.surfaceContainer }]}>
          <View style={styles.visualizerHeader}>
            <Text style={[styles.visHeaderText, { color: colors.outline }]}>
              16kHz • Float32 Mono Spooling
            </Text>
            <Text style={[styles.visStatusText, { color: isPaused ? colors.outline : colors.tertiary }]}>
              {isPaused ? '❚❚ PAUSED' : '● LIVE'}
            </Text>
          </View>

          <View style={styles.waveformContainer}>
            {waveformHeights.map((h, i) => (
              <View
                key={i}
                style={[
                  styles.waveformBar,
                  {
                    height: `${isPaused ? 15 : h}%`,
                    backgroundColor: h > 60 ? colors.primary : colors.secondary,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* 4. Live Draft Stream Feed */}
        <View style={[styles.draftCard, { backgroundColor: colors.surfaceContainer }]}>
          <View style={styles.draftHeader}>
            <View style={styles.draftTagRow}>
              <Text style={[styles.draftTag, { color: colors.tertiary }]}>⚡ Whisper.cpp Live Stream</Text>
            </View>
            <Text style={[styles.tokenCount, { color: colors.outline }]}>
              {committedClauses.length * 14} Tokens
            </Text>
          </View>

          {/* Committed Clauses */}
          <View style={styles.clausesList}>
            {committedClauses.map((c) => (
              <View key={c.id} style={styles.clauseItem}>
                <View style={[styles.offsetBadge, { backgroundColor: colors.surfaceContainerHigh }]}>
                  <Text style={[styles.offsetText, { color: colors.secondary }]}>{c.timeOffset}</Text>
                </View>
                <Text style={[styles.clauseText, { color: colors.text }]}>{c.text}</Text>
              </View>
            ))}

            {/* Currently speaking uncommitted draft */}
            <View style={styles.draftItem}>
              <View style={[styles.offsetBadge, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Text style={[styles.offsetText, { color: colors.outline }]}>live</Text>
              </View>
              <Text style={[styles.draftText, { color: colors.outline }]}>{currentDraft}</Text>
            </View>
          </View>
        </View>

        {/* 5. In-Recording Quick Actions */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[styles.quickButton, { backgroundColor: colors.surfaceContainer }]}
            onPress={() => Alert.alert('Clip Marked', 'Preserved as raw audio anchor without transcription.')}>
            <Text style={{ fontSize: 13 }}>🔖</Text>
            <Text style={[styles.quickButtonText, { color: colors.text }]}>Mark Clip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickButton, { backgroundColor: colors.surfaceContainer }]}
            onPress={() => Alert.alert('Speaker Marked', 'Speaker transition marker logged.')}>
            <Text style={{ fontSize: 13 }}>🗣️</Text>
            <Text style={[styles.quickButtonText, { color: colors.text }]}>Switch Speaker</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 6. Bottom Controls Dock */}
      <View style={[styles.dock, { backgroundColor: colors.background + 'EE', paddingBottom: Math.max(18, insets.bottom + 8) }]}>
        {/* Discard */}
        <TouchableOpacity
          style={[styles.dockSideBtn, { backgroundColor: colors.surfaceContainerHigh }]}
          onPress={handleDiscard}>
          <Text style={{ fontSize: 18 }}>🗑️</Text>
        </TouchableOpacity>

        {/* Stop & Save Button */}
        <TouchableOpacity
          style={[styles.stopButton, { backgroundColor: colors.primaryContainer }]}
          activeOpacity={0.8}
          onPress={handleStopAndSave}>
          <View style={styles.stopButtonSquare} />
          <Text style={styles.stopButtonLabel}>STOP & SAVE</Text>
        </TouchableOpacity>

        {/* Pause / Resume */}
        <TouchableOpacity
          style={[styles.dockSideBtn, { backgroundColor: colors.surfaceContainerHigh }]}
          onPress={handleTogglePause}>
          <Text style={{ fontSize: 18 }}>{isPaused ? '▶️' : '⏸️'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
  },
  airgapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  airgapText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  timerMain: {
    fontSize: 16,
    fontFamily: Fonts?.mono || 'monospace',
    fontWeight: '700',
  },
  timerSub: {
    fontSize: 11,
    fontFamily: Fonts?.mono || 'monospace',
  },
  encBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  encText: {
    fontSize: 10,
    fontWeight: '700',
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  personaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  personaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  personaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  personaTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  modelSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  visualizerCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  visualizerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  visHeaderText: {
    fontSize: 11,
    fontWeight: '500',
  },
  visStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  waveformContainer: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
  },
  waveformBar: {
    width: 6,
    borderRadius: 3,
  },
  draftCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  draftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  draftTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  draftTag: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tokenCount: {
    fontSize: 11,
  },
  clausesList: {
    gap: 12,
  },
  clauseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  offsetBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  offsetText: {
    fontSize: 11,
    fontFamily: Fonts?.mono || 'monospace',
    fontWeight: '600',
  },
  clauseText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  draftItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  draftText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  quickButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#292a2d44',
  },
  dockSideBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    height: 52,
    paddingHorizontal: 24,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  stopButtonSquare: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  stopButtonLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
