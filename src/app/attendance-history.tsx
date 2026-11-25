import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import { getAllAttendanceRecords } from '@/services/attendance-manager';
import { useAttendanceLiveSync } from '@/services/attendance-stream';
import { AttendanceRecord } from '@/types/attendance';

const BG_MAIN = '#0A0B10';

type Filter = 'all' | 'present' | 'absent';

export default function AttendanceHistoryScreen() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const all = await getAllAttendanceRecords();
      setRecords(all);
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useAttendanceLiveSync(loadData);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filtered = records.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  if (loading) {
    return (
      <View style={styles.root}>
        <Image
          source={require('@/assets/konnakol_background.png')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition="center"
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#ffffff" />
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
        colors={['rgba(10,11,16,0.50)', 'rgba(24,27,36,0.80)', 'rgba(10,11,16,0.96)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
          }
        >
          {/* Header */}
          <View style={styles.headerBlock}>
            <Text style={styles.subTitle}>LOGGED RECORDS</Text>
            <Text style={styles.title}>Attendance History</Text>
          </View>

          {/* Filters */}
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setFilter('all')}
              style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                All ({records.length})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setFilter('present')}
              style={[styles.filterPill, filter === 'present' && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, filter === 'present' && styles.filterTextActive]}>
                Present ({records.filter((r) => r.status === 'present').length})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setFilter('absent')}
              style={[styles.filterPill, filter === 'absent' && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, filter === 'absent' && styles.filterTextActive]}>
                Absent ({records.filter((r) => r.status === 'absent').length})
              </Text>
            </Pressable>
          </View>

          {/* Empty state */}
          {filtered.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Attendance Records</Text>
              <Text style={styles.emptyDesc}>
                Attendance starts empty. As lectures occur according to your timetable and you mark them, your history will appear here.
              </Text>
            </View>
          )}

          {/* List */}
          {filtered.map((r, index) => (
            <Animated.View
              key={r.id}
              entering={FadeInUp.delay(index * 25).duration(250)}
              style={[
                styles.recordCard,
                r.status === 'present' ? styles.recordCardPresent : styles.recordCardAbsent,
              ]}
            >
              <View style={styles.recordLeft}>
                <View style={styles.codeRow}>
                  <Text style={styles.codeText}>{r.subjectCode}</Text>
                  <Text style={styles.dateText}>{r.date}</Text>
                </View>
                <Text style={styles.nameText}>{r.subjectName}</Text>
                <Text style={styles.timeText}>
                  Marked: {new Date(r.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              <View
                style={[
                  styles.badge,
                  r.status === 'present' ? styles.badgePresent : styles.badgeAbsent,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    r.status === 'present' ? styles.badgeTextPresent : styles.badgeTextAbsent,
                  ]}
                >
                  {r.status === 'present' ? 'PRESENT' : 'ABSENT'}
                </Text>
              </View>
            </Animated.View>
          ))}
        </ScrollView>

        <BottomTabBar />
      </SafeAreaView>
    </View>
  );
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
    gap: 12,
  },
  headerBlock: {
    gap: 2,
  },
  subTitle: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F5F5F7',
    letterSpacing: -0.4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(20,24,30,0.6)',
    borderRadius: 0,
  },
  filterPillActive: {
    backgroundColor: '#0052FF',
    borderColor: '#387BFF',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  emptyCard: {
    backgroundColor: 'rgba(16,20,26,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 0,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5F5F7',
  },
  emptyDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.60)',
    textAlign: 'center',
    lineHeight: 18,
  },
  recordCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(16,20,26,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 0,
    padding: 14,
  },
  recordCardPresent: {
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  recordCardAbsent: {
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  recordLeft: {
    flex: 1,
    gap: 3,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A0A7B1',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 11,
    color: '#6B7280',
  },
  nameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5F5F7',
  },
  timeText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 0,
    borderWidth: 1,
  },
  badgePresent: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderColor: '#10B981',
  },
  badgeAbsent: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: '#EF4444',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextPresent: {
    color: '#10B981',
  },
  badgeTextAbsent: {
    color: '#EF4444',
  },
});
