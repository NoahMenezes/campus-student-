import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
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
import { fetchAttendanceHistory } from '@/services/attendance';
import { ThemeColors } from '@/constants/colors';

const BG_MAIN = '#0A0B10';

type Filter = 'all' | 'present' | 'absent';

export default function AttendanceHistoryScreen() {
  const [records, setRecords] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAttendanceHistory(filter === 'all' ? undefined : filter);
      setRecords(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAttendanceHistory(filter === 'all' ? undefined : filter);
        if (mounted) {
          setRecords(data);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load attendance history');
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, [filter]);

  const filtered = records.filter((r) => {
    if (filter === 'present') return r.status === 'Present' || r.status === 'present';
    if (filter === 'absent') return r.status === 'Absent' || r.status === 'absent';
    return true;
  });

  const total = records.length;
  const presentCount = records.filter((r) => r.status === 'Present' || r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'Absent' || r.status === 'absent').length;
  const pct = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  if (error && !loading) {
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
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

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
              tintColor="#2583E8"
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
                    <Text style={[styles.statValue, { color: ThemeColors.dark.success }]}>{presentCount}</Text>
                    <Text style={styles.statLabel}>Present</Text>
                  </GlassCardContent>
                </GlassCard>
                <GlassCard intensity="strong" borderRadius={0} style={styles.statCard}>
                  <GlassCardContent style={styles.statContent}>
                    <Text style={[styles.statValue, { color: ThemeColors.dark.danger }]}>{absentCount}</Text>
                    <Text style={styles.statLabel}>Absent</Text>
                  </GlassCardContent>
                </GlassCard>
                <GlassCard intensity="strong" borderRadius={0} style={styles.statCard}>
                  <GlassCardContent style={styles.statContent}>
                    <Text style={[styles.statValue, { color: ThemeColors.dark.accent }]}>{pct}%</Text>
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
                        <Text style={styles.recordSubject}>{record.subject || 'Unknown'}</Text>
                        <Text style={styles.recordMeta}>
                          {record.code || '—'} &bull; {new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} &bull; {record.time || ''}
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

        <BottomTabBar />
      </SafeAreaView>
    </View>
  );
}

function getStatusColor(status: string) {
  const s = status.toLowerCase();
  if (s === 'present') return ThemeColors.dark.success;
  if (s === 'absent') return ThemeColors.dark.danger;
  return ThemeColors.dark.warning;
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: ThemeColors.dark.danger,
    textAlign: 'center',
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
    color: '#F5F5F7',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(245,245,247,0.60)',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 0,
    backgroundColor: ThemeColors.dark.surface,
    borderWidth: 1,
    borderColor: ThemeColors.dark.border,
  },
  statContent: {
    padding: 16,
    gap: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F5F5F7',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(245,245,247,0.55)',
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
    color: 'rgba(245,245,247,0.70)',
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
    color: 'rgba(245,245,247,0.70)',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(245,245,247,0.50)',
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245,245,247,0.06)',
  },
  recordInfo: {
    flex: 1,
  },
  recordSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5F5F7',
  },
  recordMeta: {
    fontSize: 12,
    color: 'rgba(245,245,247,0.55)',
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
