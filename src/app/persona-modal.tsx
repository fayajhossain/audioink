import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Fonts } from '@/constants/theme';
import { BUILT_IN_PERSONAS } from '@/constants/personas';
import { Persona, RecordingType } from '@/types/fidelity';
import { getActivePersona, getActiveRecordingType, setActivePersonaAndType } from '@/services/persona-state';

export default function PersonaFidelityModal() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const isDark = scheme === 'dark';

  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(() => getActivePersona().id);
  const [selectedTypeId, setSelectedTypeId] = useState<string>(() => getActiveRecordingType().id);

  const activePersona: Persona = BUILT_IN_PERSONAS[selectedPersonaId] || BUILT_IN_PERSONAS.professor;
  const activeType: RecordingType =
    activePersona.recordingTypes.find((t) => t.id === selectedTypeId) || activePersona.recordingTypes[0];

  const handleSelectPersona = (pId: string) => {
    setSelectedPersonaId(pId);
    setSelectedTypeId(BUILT_IN_PERSONAS[pId].recordingTypes[0].id);
  };

  const handleConfirm = () => {
    setActivePersonaAndType(selectedPersonaId, selectedTypeId);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.outlineVariant }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={{ color: colors.outline, fontSize: 18 }}>✕</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Persona & Fidelity</Text>

        <TouchableOpacity onPress={handleConfirm}>
          <Text style={[styles.doneBtn, { color: colors.primary }]}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 60 }}>
        <Text style={[styles.sectionLabel, { color: colors.outline }]}>CHOOSE ACTIVE PERSONA</Text>

        {/* 1. Persona Cards */}
        <View style={styles.personaGrid}>
          {Object.values(BUILT_IN_PERSONAS).map((p) => {
            const isSelected = p.id === selectedPersonaId;
            const icon =
              p.id === 'professor' ? '🎓' : p.id === 'musician' ? '🎵' : p.id === 'lawyer' ? '⚖️' : '🔬';

            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.personaCard,
                  {
                    backgroundColor: isSelected ? colors.surfaceContainerHigh : colors.surfaceContainer,
                    borderColor: isSelected ? colors.primary : 'transparent',
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => handleSelectPersona(p.id)}>
                <View style={styles.cardTop}>
                  <Text style={{ fontSize: 24 }}>{icon}</Text>
                  {isSelected && (
                    <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                      <Text style={{ color: '#000', fontSize: 10, fontWeight: 'bold' }}>✓</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.personaName, { color: colors.text }]}>{p.name}</Text>
                <Text style={[styles.personaPrompt, { color: colors.textSecondary }]} numberOfLines={2}>
                  {p.systemPrompt.slice(0, 90)}...
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 2. Recording Type Sub-Selector */}
        <Text style={[styles.sectionLabel, { color: colors.outline, marginTop: 20 }]}>
          RECORDING TYPE FOR {activePersona.name.toUpperCase()}
        </Text>

        <View style={styles.typesList}>
          {activePersona.recordingTypes.map((t) => {
            const isSelected = t.id === selectedTypeId;

            return (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.typeRow,
                  {
                    backgroundColor: isSelected ? colors.surfaceContainerHigh : colors.surfaceContainer,
                    borderColor: isSelected ? colors.primary : 'transparent',
                  },
                ]}
                onPress={() => setSelectedTypeId(t.id)}>
                <View style={styles.typeRowLeft}>
                  <Text style={[styles.typeLabel, { color: colors.text }]}>{t.label}</Text>
                  <View style={styles.fidelityTagsRow}>
                    <Text style={[styles.fidelityChip, { color: colors.secondary }]}>
                      {t.fidelity.keepRepetitions ? 'Verbatim' : 'Clean View'}
                    </Text>
                    <Text style={[styles.fidelityChip, { color: colors.outline }]}>•</Text>
                    <Text style={[styles.fidelityChip, { color: colors.outline }]}>
                      {t.fidelity.pauseMarkerMs ? `Pauses ≥ ${t.fidelity.pauseMarkerMs}ms` : 'Ignore Pauses'}
                    </Text>
                    <Text style={[styles.fidelityChip, { color: colors.outline }]}>•</Text>
                    <Text style={[styles.fidelityChip, { color: colors.tertiary }]}>
                      Audio: {t.fidelity.keepAudio}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.radioCircle,
                    { borderColor: isSelected ? colors.primary : colors.outline },
                  ]}>
                  {isSelected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3. Output Note Sections Preview */}
        <Text style={[styles.sectionLabel, { color: colors.outline, marginTop: 20 }]}>
          TARGET NOTE SECTIONS
        </Text>
        <View style={[styles.sectionsPreviewCard, { backgroundColor: colors.surfaceContainer }]}>
          {activeType.noteSections.map((sec, idx) => (
            <View key={idx} style={styles.sectionItemRow}>
              <Text style={[styles.secNumber, { color: colors.secondary }]}>{idx + 1}.</Text>
              <Text style={[styles.secTitle, { color: colors.text }]}>{sec}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  doneBtn: {
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  personaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  personaCard: {
    width: '48%',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  personaPrompt: {
    fontSize: 11,
    lineHeight: 15,
  },
  typesList: {
    gap: 8,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  typeRowLeft: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  fidelityTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fidelityChip: {
    fontSize: 11,
    fontFamily: Fonts?.mono || 'monospace',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sectionsPreviewCard: {
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  sectionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secNumber: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts?.mono || 'monospace',
  },
  secTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
});

