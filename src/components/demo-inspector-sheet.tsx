import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  closeDemoSheet,
  DemoModeSnapshot,
  hydrateDemoMode,
  openDemoSheet,
  setActiveDemoTrace,
  setDemoModeEnabled,
  subscribeDemoMode,
} from '@/services/demo-mode';

const MONO_FONT = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export function DemoInspectorSheet() {
  const [snap, setSnap] = useState<DemoModeSnapshot>({
    enabled: false,
    hydrated: false,
    sheetOpen: false,
    activeTraceId: null,
    burstTraces: [],
    history: [],
  });

  useEffect(() => {
    hydrateDemoMode().catch(() => {});
    return subscribeDemoMode(setSnap);
  }, []);

  const tracesToShow = snap.burstTraces.length > 0 ? snap.burstTraces : snap.history.slice(0, 6);
  const activeEntry = useMemo(
    () =>
      tracesToShow.find((t) => t.id === snap.activeTraceId) ||
      tracesToShow[0] ||
      null,
    [tracesToShow, snap.activeTraceId]
  );

  if (!snap.enabled) {
    return null;
  }

  return (
    <>
      {!snap.sheetOpen && (
        <Pressable
          onPress={openDemoSheet}
          style={styles.floatingPill}
          accessibilityLabel="Open MongoDB Demo Inspector"
        >
          <View style={styles.liveDot} />
          <Text style={styles.floatingPillText}>
            DEMO{activeEntry ? ` · ${activeEntry.meta.ms}ms` : ''}
          </Text>
        </Pressable>
      )}

      <Modal
        visible={snap.sheetOpen && Boolean(activeEntry)}
        transparent
        animationType="slide"
        onRequestClose={closeDemoSheet}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.backdropDismissArea} onPress={closeDemoSheet} />

          {activeEntry ? (
            <View style={styles.sheetContainer}>
              <View style={styles.dragHandle} />

              {/* Sheet Top Bar */}
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <View style={styles.inspectorLabelRow}>
                    <View style={styles.liveDot} />
                    <Text style={styles.inspectorEyebrow}>MONGODB DEMO INSPECTOR</Text>
                  </View>
                  <Text style={styles.actionTitle} numberOfLines={1}>
                    {activeEntry.actionLabel}
                  </Text>
                  <Text style={styles.endpointSubtitle} numberOfLines={1}>
                    {activeEntry.method} {activeEntry.path} &bull; HTTP {activeEntry.status}
                  </Text>
                </View>

                <View style={styles.headerRight}>
                  <View style={styles.msBadge}>
                    <Text style={styles.msText}>{activeEntry.meta.ms} ms</Text>
                  </View>
                </View>
              </View>

              {/* Multi-request chips when an action fires parallel/refresh API calls */}
              {tracesToShow.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.requestChipScroll}
                  contentContainerStyle={styles.requestChipRow}
                >
                  {tracesToShow.map((t) => {
                    const selected = t.id === activeEntry.id;
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => setActiveDemoTrace(t.id)}
                        style={[styles.requestChip, selected && styles.requestChipActive]}
                      >
                        <Text
                          style={[
                            styles.requestChipText,
                            selected && styles.requestChipTextActive,
                          ]}
                        >
                          {t.method} {t.path.split('?')[0]} ({t.meta.ms}ms)
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Topic Badges */}
                <Text style={styles.sectionLabel}>MONGODB TOPICS &amp; OPERATORS</Text>
                {activeEntry.meta.concepts.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyBoxText}>No topic tags attached to this response.</Text>
                  </View>
                ) : (
                  <View style={styles.conceptsList}>
                    {activeEntry.meta.concepts.map((concept, idx) => (
                      <View
                        key={`${concept.topic}_${idx}`}
                        style={styles.conceptCard}
                      >
                        <View style={styles.topicBadge}>
                          <Text style={styles.topicBadgeText}>
                            Topic {concept.topic} &middot; {concept.operators.join(' + ')}
                          </Text>
                        </View>
                        <Text style={styles.conceptWhy}>
                          {concept.topicName}: {concept.why}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Exact Query JSON */}
                <View style={styles.queriesHeaderRow}>
                  <Text style={styles.sectionLabel}>
                    EXACT QUERY JSON ({activeEntry.meta.queries.length})
                  </Text>
                  <Text style={styles.timingSub}>
                    Executed in {activeEntry.meta.ms} ms
                  </Text>
                </View>

                {activeEntry.meta.queries.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyBoxText}>No database queries executed.</Text>
                  </View>
                ) : (
                  activeEntry.meta.queries.map((q, qIdx) => (
                    <View key={qIdx} style={styles.queryBlockCard}>
                      <View style={styles.queryMetaBar}>
                        <Text style={styles.queryCollectionText}>
                          {String(q.collection || 'mongodb')}.{String(q.op || 'query')}
                        </Text>
                        <Text style={styles.queryIndexText}>#{qIdx + 1}</Text>
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <Text selectable style={styles.queryJsonText}>
                          {JSON.stringify(q, null, 2)}
                        </Text>
                      </ScrollView>
                    </View>
                  ))
                )}
              </ScrollView>

              {/* Footer Controls */}
              <View style={styles.footerRow}>
                <Pressable
                  onPress={() => setDemoModeEnabled(false)}
                  style={styles.disableBtn}
                >
                  <Text style={styles.disableBtnText}>Turn Off Demo Mode</Text>
                </Pressable>
                <Pressable onPress={closeDemoSheet} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingPill: {
    position: 'absolute',
    bottom: 94,
    right: 18,
    zIndex: 9998,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 82, 255, 0.92)',
    borderWidth: 1,
    borderColor: '#60A5FA',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  floatingPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 10, 0.70)',
    justifyContent: 'flex-end',
  },
  backdropDismissArea: {
    flex: 1,
  },
  sheetContainer: {
    maxHeight: '84%',
    backgroundColor: '#111420',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingTop: 10,
    paddingBottom: 22,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    gap: 12,
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  inspectorLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  inspectorEyebrow: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  actionTitle: {
    color: '#F5F5F7',
    fontSize: 18,
    fontWeight: '700',
  },
  endpointSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
    fontFamily: MONO_FONT,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  msBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.45)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  msText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: MONO_FONT,
  },
  requestChipScroll: {
    maxHeight: 40,
    marginBottom: 8,
  },
  requestChipRow: {
    paddingHorizontal: 18,
    gap: 8,
    alignItems: 'center',
  },
  requestChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  requestChipActive: {
    backgroundColor: 'rgba(0, 82, 255, 0.25)',
    borderColor: '#3B82F6',
  },
  requestChipText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: MONO_FONT,
  },
  requestChipTextActive: {
    color: '#FFFFFF',
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetScrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  sectionLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  conceptsList: {
    gap: 8,
    marginBottom: 10,
  },
  conceptCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  topicBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 82, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.45)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  topicBadgeText: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '700',
  },
  conceptWhy: {
    color: '#D1D5DB',
    fontSize: 12,
    lineHeight: 17,
  },
  queriesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timingSub: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyBoxText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  queryBlockCard: {
    backgroundColor: '#090B12',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  queryMetaBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
    paddingBottom: 6,
    marginBottom: 8,
  },
  queryCollectionText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: MONO_FONT,
  },
  queryIndexText: {
    color: '#6B7280',
    fontSize: 10,
    fontFamily: MONO_FONT,
  },
  queryJsonText: {
    color: '#E5E7EB',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: MONO_FONT,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  disableBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  disableBtnText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0052FF',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
