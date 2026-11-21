import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
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
  getStudentBatch,
  getYesterdayAttendanceSummary,
  markAttendanceSession,
} from '@/services/attendance-manager';
import { DailyAttendanceSummary, LabBatch, LectureSession } from '@/types/attendance';

const BG_MAIN = '#0A0B10';

export default function YesterdayAttendanceScreen() {
  const [data, setData] = useState<DailyAttendanceSummary | null>(null);
  const [batch, setBatch] = useState<LabBatch>('C');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const activeBatch = await getStudentBatch();
      setBatch(activeBatch);
      const res = await getYesterdayAttendanceSummary(activeBatch);
      setData(res);
    } catch (err) {
      console.error('Failed to load yesterday sessions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleMark = async (session: LectureSession, status: 'present' | 'absent') => {
    if (markingId) return;
    setMarkingId(session.id);
    try {
      await markAttendanceSession(session, status, batch);
      await loadData();
    } catch (err) {
      console.error('Failed to mark yesterday attendance:', err);
    } finally {
      setMarkingId(null);
    }
  };

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

  const isWeekend = data?.sessions.length === 0;

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
            <View>
              <Text style={styles.dayLabel}>
                {data?.day?.toUpperCase()} &bull; {data?.date}
              </Text>
              <Text style={styles.pageTitle}>Yesterday&apos;s Attendance</Text>
            </View>
            <View style={styles.batchBadge}>
              <Text style={styles.batchBadgeText}>BATCH {batch}</Text>
            </View>
          </View>

          {/* Summary Strip */}
          {data && !isWeekend && (
            <View style={styles.summaryStrip}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{data.totalClasses}</Text>
                <Text style={styles.summaryLabel}>Total</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                  {data.attendedClasses}
                </Text>
                <Text style={styles.summaryLabel}>Attended</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                  {data.absentClasses}
                </Text>
                <Text style={styles.summaryLabel}>Missed</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>
                  {data.unmarkedClasses}
                </Text>
                <Text style={styles.summaryLabel}>Unmarked</Text>
              </View>
            </View>
          )}

          {/* Weekend / No Classes State */}
          {isWeekend && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Classes Yesterday</Text>
              <Text style={styles.emptyDesc}>
                Yesterday ({data?.day || 'Sunday'}) had no scheduled classes on the Semester 5 timetable.
              </Text>
            </View>
          )}

          {/* Sessions */}
          {data?.sessions.map((session, index) => {
            const isMarkedPresent = session.status === 'present';
            const isMarkedAbsent = session.status === 'absent';
            const isUnmarked = !isMarkedPresent && !isMarkedAbsent;
            const isBusy = markingId === session.id;

            return (
              <Animated.View
                key={session.id}
                entering={FadeInUp.delay(index * 40).duration(300)}
                style={[
                  styles.sessionCard,
                  isMarkedPresent && styles.sessionCardPresent,
                  isMarkedAbsent && styles.sessionCardAbsent,
                  isUnmarked && styles.sessionCardUnmarked,
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.timeBadge}>
                    <Text style={styles.timeBadgeText}>
                      {session.startTime} &ndash; {session.endTime}
                    </Text>
                  </View>
                  <View style={styles.cardBadges}>
                    <View
                      style={[
                        styles.typeBadge,
                        session.type === 'lab' ? styles.typeBadgeLab : styles.typeBadgeTheory,
                      ]}
                    >
                      <Text style={styles.typeBadgeText}>
                        {session.type === 'lab' ? 'LAB' : 'THEORY'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        isMarkedPresent
                          ? styles.statusBadgePresent
                          : isMarkedAbsent
                          ? styles.statusBadgeAbsent
                          : styles.statusBadgeUnmarked,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isMarkedPresent
                            ? styles.statusTextPresent
                            : isMarkedAbsent
                            ? styles.statusTextAbsent
                            : styles.statusTextUnmarked,
                        ]}
                      >
                        {isMarkedPresent
                          ? 'ATTENDED'
                          : isMarkedAbsent
                          ? 'MISSED'
                          : 'UNMARKED'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.subjectCode}>{session.subjectCode}</Text>
                  <Text style={styles.subjectTitle}>{session.subjectName}</Text>
                  <Text style={styles.roomLabel}>Location: {session.room}</Text>
                </View>

                {/* Retroactive Action Buttons */}
                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => handleMark(session, 'present')}
                    disabled={isBusy}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      styles.presentBtn,
                      isMarkedPresent && styles.presentBtnActive,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionBtnText,
                        styles.presentBtnText,
                        isMarkedPresent && styles.actionBtnTextActive,
                      ]}
                    >
                      {isMarkedPresent ? '✓ ATTENDED' : 'MARK ATTENDED'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleMark(session, 'absent')}
                    disabled={isBusy}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      styles.absentBtn,
                      isMarkedAbsent && styles.absentBtnActive,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionBtnText,
                        styles.absentBtnText,
                        isMarkedAbsent && styles.actionBtnTextActive,
                      ]}
                    >
                      {isMarkedAbsent ? '✗ MISSED' : 'MARK MISSED'}
                    </Text>
                  </Pressable>
                </View>
              </Animated.View>
            );
          })}
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
    gap: 14,
  },
  headerBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dayLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F5F5F7',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  batchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 0,
  },
  batchBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A0A7B1',
  },
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16,20,26,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 0,
    paddingVertical: 12,
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F5F5F7',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.10)',
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
  sessionCard: {
    backgroundColor: 'rgba(16,20,26,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 0,
    padding: 16,
    gap: 12,
  },
  sessionCardPresent: {
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  sessionCardAbsent: {
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  sessionCardUnmarked: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 0,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  cardBadges: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
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
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 0,
    borderWidth: 1,
  },
  statusBadgePresent: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderColor: '#10B981',
  },
  statusBadgeAbsent: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: '#EF4444',
  },
  statusBadgeUnmarked: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: '#F59E0B',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  statusTextPresent: {
    color: '#10B981',
  },
  statusTextAbsent: {
    color: '#EF4444',
  },
  statusTextUnmarked: {
    color: '#F59E0B',
  },
  cardBody: {
    gap: 2,
  },
  subjectCode: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  subjectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5F5F7',
  },
  roomLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 0,
  },
  presentBtn: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  presentBtnActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  presentBtnText: {
    color: '#10B981',
  },
  absentBtn: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  absentBtnActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  absentBtnText: {
    color: '#EF4444',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  actionBtnTextActive: {
    color: '#FFFFFF',
  },
});
