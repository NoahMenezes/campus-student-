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
import {
  getOverallAttendanceSummary,
  getSubjectWiseAttendanceStats,
} from '@/services/attendance-manager';
import { useAttendanceLiveSync } from '@/services/attendance-stream';
import { OverallAttendanceSummary, SubjectAttendanceStats } from '@/types/attendance';

const BG_MAIN = '#0A0B10';

export default function SubjectsScreen() {
  const [subjects, setSubjects] = useState<SubjectAttendanceStats[]>([]);
  const [summary, setSummary] = useState<OverallAttendanceSummary | null>(null);
  const [filter, setFilter] = useState<'all' | 'theory' | 'lab'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [stats, sum] = await Promise.all([
        getSubjectWiseAttendanceStats(),
        getOverallAttendanceSummary(),
      ]);
      setSubjects(stats);
      setSummary(sum);
    } catch (err) {
      console.error('Failed to load subjects:', err);
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

  const filteredSubjects = subjects.filter((s) => {
    if (filter === 'all') return true;
    return s.type === filter;
  });

  const theoryCount = subjects.filter((s) => s.type === 'theory').length;
  const labCount = subjects.filter((s) => s.type === 'lab').length;

  if (loading) {
    return (
      <View style={styles.root}>
        <Image
          source={require('@/assets/konnakol_background.png')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition="center"
        />
        <LinearGradient
          colors={['rgba(10,11,16,0.60)', 'rgba(24,27,36,0.88)', 'rgba(10,11,16,0.96)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
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
          <View style={styles.headerRow}>
            <View style={styles.greetingBlock}>
              <Text style={styles.headerTitle}>Semester 5 Subjects</Text>
              <Text style={styles.headerSubtitle}>
                Computer Engineering &bull; Section B &bull; {subjects.length} Courses
              </Text>
            </View>
            <View style={styles.overallBadge}>
              <Text style={styles.overallLabel}>OVERALL</Text>
              <Text style={styles.overallPct}>
                {summary && summary.hasRecords ? `${summary.percentage}%` : '0%'}
              </Text>
            </View>
          </View>

          {/* Filter Pills */}
          <View style={styles.filterBar}>
            <Pressable
              onPress={() => setFilter('all')}
              style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                All ({subjects.length})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setFilter('theory')}
              style={[styles.filterPill, filter === 'theory' && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, filter === 'theory' && styles.filterTextActive]}>
                Theory ({theoryCount})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setFilter('lab')}
              style={[styles.filterPill, filter === 'lab' && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, filter === 'lab' && styles.filterTextActive]}>
                Laboratories ({labCount})
              </Text>
            </Pressable>
          </View>

          {/* Subjects List */}
          {filteredSubjects.map((subject, idx) => (
            <Animated.View
              key={subject.id}
              entering={FadeInUp.delay(idx * 30).duration(300)}
              style={styles.subjectCard}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.subjectCode}>{subject.code}</Text>
                  <View
                    style={[
                      styles.typeBadge,
                      subject.type === 'lab' ? styles.typeBadgeLab : styles.typeBadgeTheory,
                    ]}
                  >
                    <Text style={styles.typeBadgeText}>
                      {subject.type === 'lab'
                        ? 'LAB'
                        : subject.type === 'other'
                          ? 'ACTIVITY'
                          : 'THEORY'}
                    </Text>
                  </View>
                  {subject.category === 'elective' && (
                    <View style={styles.electiveBadge}>
                      <Text style={styles.electiveBadgeText}>ELECTIVE</Text>
                    </View>
                  )}
                </View>

                <View style={styles.statusIndicator}>
                  {subject.classesConducted === 0 || subject.percentage === null ? (
                    <Text style={styles.emptyStatusText}>0 CLASSES</Text>
                  ) : subject.status === 'safe' ? (
                    <View style={styles.safeBadge}>
                      <Text style={styles.safeText}>SAFE</Text>
                    </View>
                  ) : subject.status === 'warning' ? (
                    <View style={[styles.warningBadge, { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                      <Text style={[styles.warningText, { color: '#F59E0B' }]}>AT RISK</Text>
                    </View>
                  ) : (
                    <View style={styles.warningBadge}>
                      <Text style={styles.warningText}>NEEDS {subject.neededClassesFor75} MORE</Text>
                    </View>
                  )}
                </View>
              </View>

              <Text style={styles.subjectName}>{subject.name}</Text>

              {/* Progress and Numbers */}
              <View style={styles.statsRow}>
                <View style={styles.statsLeft}>
                  <Text style={styles.ratioText}>
                    {subject.classesAttended} / {subject.classesConducted} attended
                  </Text>
                  <Text style={styles.absentText}>
                    ({subject.classesAbsent} absent)
                  </Text>
                </View>
                <Text
                  style={[
                    styles.percentageValue,
                    {
                      color:
                        subject.classesConducted === 0 || subject.percentage === null
                          ? '#9CA3AF'
                          : subject.progressColor,
                    },
                  ]}
                >
                  {subject.classesConducted === 0 || subject.percentage === null
                    ? '--'
                    : `${subject.percentage}%`}
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width:
                        subject.classesConducted === 0 || subject.percentage === null
                          ? '0%'
                          : `${subject.percentage}%`,
                      backgroundColor:
                        subject.classesConducted === 0 || subject.percentage === null
                          ? '#374151'
                          : subject.progressColor,
                    },
                  ]}
                />
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  greetingBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F5F5F7',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(245,245,247,0.55)',
    marginTop: 3,
  },
  overallBadge: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 0,
  },
  overallLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  overallPct: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0052FF',
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
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
  subjectCard: {
    backgroundColor: 'rgba(16,20,26,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 0,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subjectCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A0A7B1',
    letterSpacing: 0.5,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 0,
    borderWidth: 1,
  },
  typeBadgeTheory: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderColor: 'rgba(59,130,246,0.4)',
  },
  typeBadgeLab: {
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderColor: 'rgba(168,85,247,0.4)',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  electiveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: 'rgba(245,158,11,0.4)',
    borderWidth: 1,
    borderRadius: 0,
  },
  electiveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  statusIndicator: {
    alignItems: 'flex-end',
  },
  emptyStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  safeBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 0,
  },
  safeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  warningBadge: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: '#EF4444',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 0,
  },
  warningText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F5F5F7',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratioText: {
    fontSize: 12,
    color: '#E5E7EB',
    fontWeight: '500',
  },
  absentText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  percentageValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 0,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 0,
  },
});
