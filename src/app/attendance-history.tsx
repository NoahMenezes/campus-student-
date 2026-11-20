import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { GlassButton } from '@/components/glass/glass-button';
import { GlassCard, GlassCardContent } from '@/components/glass/glass-card';
import { BottomTabBar } from '@/components/bottom-tab-bar';

const BG_MAIN = '#090A0C';
const BRAND = '#A0A7B1';
const SAGE = '#8A9A7B';
const DUSTY_RED = '#B55A5A';
const AMBER = '#C9A227';

type HistoryRecord = {
  id: string;
  subject: string;
  code: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  time?: string;
};

type Filter = 'all' | 'present' | 'absent';

const DEFAULT_HISTORY: HistoryRecord[] = [
  { id: 'h1', subject: 'DBMS', code: 'CS501', date: '2025-11-18', status: 'present', time: '09:00 AM' },
  { id: 'h2', subject: 'Operating Systems', code: 'CS502', date: '2025-11-17', status: 'present', time: '10:30 AM' },
  { id: 'h3', subject: 'Networks', code: 'CS503', date: '2025-11-16', status: 'absent', time: '02:00 PM' },
  { id: 'h4', subject: 'DBMS', code: 'CS501', date: '2025-11-15', status: 'present', time: '09:00 AM' },
  { id: 'h5', subject: 'Networks', code: 'CS503', date: '2025-11-14', status: 'present', time: '02:00 PM' },
  { id: 'h6', subject: 'Operating Systems', code: 'CS502', date: '2025-11-13', status: 'absent', time: '10:30 AM' },
  { id: 'h7', subject: 'DBMS', code: 'CS501', date: '2025-11-12', status: 'present', time: '09:00 AM' },
];

export default function AttendanceHistoryScreen() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${baseUrl}/attendance/history`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (mounted && res.ok) {
          const data = await res.json();
          setRecords(data.records || DEFAULT_HISTORY);
        } else if (mounted) {
          setRecords(DEFAULT_HISTORY);
        }
      } catch {
        if (mounted) setRecords(DEFAULT_HISTORY);
      } finally {
        if (mounted) setLoading(false);
        if (mounted) setRefreshing(false);
      }
    })();
    return () => {
      // noop
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
  };

  const filtered = records.filter((r) => {
    if (filter === 'present') return r.status === 'present';
    if (filter === 'absent') return r.status === 'absent';
    return true;
  });

  const total = records.length;
  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const pct = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  return (
    <View style={styles.root}>
      <Image
        source={require('@/assets/konnakol_background.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="center"
      />
      <LinearGradient
        colors={['rgba(9,10,12,0.45)', 'rgba(16,18,22,0.75)', 'rgba(9,10,12,0.94)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || loading}
              onRefresh={handleRefresh}
              tintColor="#0052FF"
            />
          }
        >
          {loading && (
            <View style={styles.loadingCenter}>
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          )}

          {!loading && (
            <>
              <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.headerContainer}>
                <Text style={styles.headerTitle}>Attendance History</Text>
                <Text style={styles.headerSubtitle}>
                  Chronological record of your class attendance
                </Text>
              </Animated.View>

              <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.summaryRow}>
                <GlassCard intensity="strong" borderRadius={0} style={styles.statCard}>
                  <GlassCardContent style={styles.statContent}>
                    <Text style={styles.statValue}>{total}</Text>
                    <Text style={styles.statLabel}>Total Classes</Text>
                  </GlassCardContent>
                </GlassCard>
                <GlassCard intensity="strong" borderRadius={0} style={styles.statCard}>
                  <GlassCardContent style={styles.statContent}>
                    <Text style={[styles.statValue, { color: SAGE }]}>{presentCount}</Text>
                    <Text style={styles.statLabel}>Present</Text>
                  </GlassCardContent>
                </GlassCard>
                <GlassCard intensity="strong" borderRadius={0} style={styles.statCard}>
                  <GlassCardContent style={styles.statContent}>
                    <Text style={[styles.statValue, { color: DUSTY_RED }]}>{absentCount}</Text>
                    <Text style={styles.statLabel}>Absent</Text>
                  </GlassCardContent>
                </GlassCard>
                <GlassCard intensity="strong" borderRadius={0} style={styles.statCard}>
                  <GlassCardContent style={styles.statContent}>
                    <Text style={[styles.statValue, { color: BRAND }]}>{pct}%</Text>
                    <Text style={styles.statLabel}>Attendance</Text>
                  </GlassCardContent>
                </GlassCard>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(600).delay(400)} style={styles.filterRow}>
                <Text style={styles.filterLabel}>Filter</Text>
                <View style={styles.filterGroup}>
                  {(['all', 'present', 'absent'] as Filter[]).map((f) => (
                    <GlassButton
                      key={f}
                      variant={filter === f ? 'default' : 'glass'}
                      size="sm"
                      active={filter === f}
                      onPress={() => setFilter(f)}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </GlassButton>
                  ))}
                </View>
              </Animated.View>

              <Animated.View entering={FadeInUp.duration(600).delay(500)} style={styles.recordsContainer}>
                <Text style={styles.sectionTitle}>
                  {filtered.length === 0 ? 'No records found' : 'Attendance Records'}
                </Text>

                {filtered.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No attendance records available.</Text>
                  </View>
                ) : (
                  filtered.map((record) => (
                    <View key={record.id} style={styles.recordRow}>
                      <View style={styles.recordInfo}>
                        <Text style={styles.recordSubject}>{record.subject}</Text>
                        <Text style={styles.recordMeta}>
                          {record.code} &bull; {formatDate(record.date)} &bull; {record.time || ''}
                        </Text>
                      </View>
                      <View style={styles.recordStatus}>
                        <View style={styles.statusDot} />
                        <Text style={[styles.recordStatusText, { color: getStatusColor(record.status) }]}>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </Animated.View>

              <View style={styles.bottomSpacer} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <BottomTabBar />
    </View>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getStatusColor(status: string) {
  if (status === 'present') return SAGE;
  if (status === 'absent') return DUSTY_RED;
  return AMBER;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_MAIN,
  },
  safeArea: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navWrapper: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    zIndex: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 16,
  },
  headerContainer: {
    gap: 8,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F0F0F0',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.60)',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 0,
  },
  statContent: {
    padding: 16,
    gap: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F0F0F0',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.2,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.70)',
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  recordsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.70)',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.50)',
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  recordInfo: {
    flex: 1,
  },
  recordSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F0F0F0',
  },
  recordMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  recordStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  recordStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 20,
  },
});
