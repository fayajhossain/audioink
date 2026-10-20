import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { getAllRecordings, getNoteForRecording } from '@/services/storage/database';
import { Recording, StructuredNote } from '@/types/recording';
import { BUILT_IN_PERSONAS } from '@/constants/personas';

type EnrichedRecording = Recording & {
  note?: StructuredNote | null;
};

export default function NotesLibraryScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const isDark = scheme === 'dark';

  const [recordings, setRecordings] = useState<EnrichedRecording[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const recs = await getAllRecordings();
      const enriched = await Promise.all(
        recs.map(async (r) => {
          const note = await getNoteForRecording(r.id);
          return { ...r, note };
        })
      );
      setRecordings(enriched);
    } catch (e) {
      console.warn('[Library] Failed to load recordings:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load recordings on focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filterOptions = [
    { id: 'all', label: 'All', icon: '✦' },
    { id: 'lecture', label: 'Lectures', icon: '🎓' },
    { id: 'interview', label: 'Interviews', icon: '💬' },
    { id: 'client-meeting', label: 'Meetings', icon: '👥' },
    { id: 'idea-capture', label: 'Music & Ideas', icon: '🎵' },
    { id: 'dictation', label: 'Legal Memos', icon: '⚖️' },
  ];

  const filteredRecordings = recordings.filter((r) => {
    // Category filter
    if (selectedFilter !== 'all' && r.recordingTypeId !== selectedFilter) {
      return false;
    }
    // Search query filter
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const persona = BUILT_IN_PERSONAS[r.personaId]?.name.toLowerCase() || '';
      const type = r.recordingTypeId.toLowerCase();
      const noteTitle = r.note?.sections?.[0]?.title?.toLowerCase() || '';
      const noteBody = r.note?.sections?.map((s) => s.items.map((i) => i.text).join(' ')).join(' ').toLowerCase() || '';

      return persona.includes(q) || type.includes(q) || noteTitle.includes(q) || noteBody.includes(q);
    }
    return true;
  });

  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* 1. Header */}
      <View style={[styles.header, { borderBottomColor: colors.outlineVariant }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.brandIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Text style={[styles.brandIconText, { color: colors.primary }]}>∿</Text>
          </View>
          <View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>AudioInk</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: colors.tertiary }]} />
              <Text style={[styles.statusText, { color: colors.tertiary }]}>OFFLINE • PRIVATE</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: colors.surfaceContainer }]}
          onPress={() => router.push('/settings')}>
          <Text style={{ color: colors.text, fontSize: 16 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* 2. Subheader & Stats */}
        <View style={styles.subHeader}>
          <View>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Notes Library</Text>
            <Text style={[styles.vaultSubtitle, { color: colors.outline }]}>
              {recordings.length} private notes on-device • Fully indexed
            </Text>
          </View>
          <View style={[styles.vaultBadge, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Text style={[styles.vaultBadgeText, { color: colors.secondary }]}>Local Vault</Text>
          </View>
        </View>

        {/* 3. Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surfaceContainer }]}>
          <Text style={[styles.searchIcon, { color: colors.outline }]}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search text, concepts, or spoken words..."
            placeholderTextColor={colors.outline}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={{ color: colors.outline, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 4. Filter Pills */}
        <View style={styles.filtersScroll}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={filterOptions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.filtersContainer}
            renderItem={({ item }) => {
              const isSelected = selectedFilter === item.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: isSelected ? colors.primaryContainer : colors.surfaceContainer,
                    },
                  ]}
                  onPress={() => setSelectedFilter(item.id)}>
                  <Text style={{ fontSize: 12 }}>{item.icon}</Text>
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: isSelected ? '#ffffff' : colors.textSecondary },
                    ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* 5. Notes List */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredRecordings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceContainer }]}>
              <Text style={{ fontSize: 32 }}>🎙️</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No recordings found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.outline }]}>
              {searchQuery.length > 0
                ? 'Try a different search query or clear the filter.'
                : 'Tap the Record button below to capture speech with on-device transcription.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredRecordings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 120 }}
            renderItem={({ item }) => {
              const persona = BUILT_IN_PERSONAS[item.personaId];
              const title = item.note?.sections?.[0]?.title
                ? `${item.note.sections[0].title}`
                : `${persona?.name || 'Voice'} Note`;
              const snippet = item.note?.sections?.[0]?.items?.[0]?.text || 'Tap to view live transcript and generate structured notes.';

              return (
                <TouchableOpacity
                  style={[styles.noteCard, { backgroundColor: colors.surfaceContainer }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (item.note) {
                      router.push(`/notes/${item.id}`);
                    } else {
                      router.push(`/transcript/${item.id}`);
                    }
                  }}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.tagGroup}>
                      <View style={[styles.personaTag, { backgroundColor: colors.surfaceContainerHigh }]}>
                        <Text style={[styles.personaTagText, { color: colors.primary }]}>
                          {persona?.name || 'General'} • {item.recordingTypeId}
                        </Text>
                      </View>
                      <Text style={[styles.dateText, { color: colors.outline }]}>
                        {formatDuration(item.durationMs || 0)}
                      </Text>
                    </View>

                    <View style={[styles.audioTag, { backgroundColor: colors.surfaceContainerHigh }]}>
                      <Text style={[styles.audioTagText, { color: colors.secondary }]}>16kHz local</Text>
                    </View>
                  </View>

                  {/* Card Title & Snippet */}
                  <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={[styles.cardSnippet, { color: colors.textSecondary }]} numberOfLines={2}>
                    {snippet}
                  </Text>

                  {/* Grounding & Citations Indicator */}
                  {item.note && (
                    <View style={styles.groundingRow}>
                      <Text style={[styles.groundingText, { color: colors.tertiary }]}>
                        ✓ Grounded with segment citations
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* 6. Floating Bottom Action Dock */}
      <View style={[styles.floatingDock, { backgroundColor: colors.surface + 'E6', bottom: Math.max(20, insets.bottom + 10) }]}>
        <TouchableOpacity
          style={[styles.dockIconBtn, { backgroundColor: colors.surfaceContainerHigh }]}
          onPress={() => router.push('/')}>
          <Text style={{ fontSize: 20 }}>📚</Text>
        </TouchableOpacity>

        {/* Big Record Button */}
        <TouchableOpacity
          style={[styles.bigRecordButton, { backgroundColor: colors.primaryContainer }]}
          activeOpacity={0.85}
          onPress={() => router.push('/record')}>
          <View style={styles.recordInnerPulse}>
            <Text style={styles.recordButtonIcon}>🎙️</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dockIconBtn, { backgroundColor: colors.surfaceContainerHigh }]}
          onPress={() => router.push('/settings')}>
          <Text style={{ fontSize: 20 }}>🔒</Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIconText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  vaultSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  vaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  vaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  filtersScroll: {
    marginBottom: 16,
  },
  filtersContainer: {
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: 40,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  noteCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personaTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  personaTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
  },
  audioTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  audioTagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  cardSnippet: {
    fontSize: 13,
    lineHeight: 18,
  },
  groundingRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  groundingText: {
    fontSize: 11,
    fontWeight: '500',
  },
  floatingDock: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  dockIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigRecordButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  recordInnerPulse: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonIcon: {
    fontSize: 24,
  },
});
