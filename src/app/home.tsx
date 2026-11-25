import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import {
  getOverallAttendanceSummary,
  getStudentBatch,
  getTodayAttendanceSummary,
  markAttendanceSession,
  setStudentBatch,
} from '@/services/attendance-manager';
import { ApiRequestError, getToken, getUser } from '@/services/auth';
import { useAttendanceLiveSync } from '@/services/attendance-stream';
import { toggleDemoMode } from '@/services/demo-mode';
import { getUnreadNotificationCount } from '@/services/notifications';
import { getCurrentISTTimeMinutes, parseMinutesFromTimeString } from '@/services/timetable';
import {
  DailyAttendanceSummary,
  LabBatch,
  LectureSession,
  OverallAttendanceSummary,
} from '@/types/attendance';

const BG_MAIN = '#0A0B10';

export default function HomeScreen() {
  const [userName, setUserName] = useState<string>('Noah Menezes');
  const [batch, setBatch] = useState<LabBatch>('C');
  const [overall, setOverall] = useState<OverallAttendanceSummary | null>(null);
  const [todayData, setTodayData] = useState<DailyAttendanceSummary | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/login' as any);
        return;
      }

      const [u, b] = await Promise.all([getUser(), getStudentBatch()]);
      if (u?.name) setUserName(u.name);
      setBatch(b);

      const [sum, tData, unreadCount] = await Promise.all([
        getOverallAttendanceSummary(),
        getTodayAttendanceSummary(b),
        getUnreadNotificationCount().catch(() => 0),
      ]);

      setOverall(sum);
      setTodayData(tData);
      setUnreadNotifs(unreadCount);
      setLoadError(null);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        router.replace('/login' as any);
        return;
      }
      setLoadError(
        err instanceof Error ? err.message : 'Unable to reach server. Check your connection.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  useAttendanceLiveSync(loadAll);

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const handleToggleBatch = async (newBatch: LabBatch) => {
    setBatch(newBatch);
    await setStudentBatch(newBatch);
    loadAll();
  };

  const handleMark = async (session: LectureSession, status: 'present' | 'absent') => {
    if (markingId) return;
    setMarkingId(session.id);
    try {
      await markAttendanceSession(session, status, batch);
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to mark attendance';
      Alert.alert('Cannot Mark Attendance', msg);
    } finally {
      setMarkingId(null);
    }
  };

  // Find next upcoming lecture today
  const currentMinutes = getCurrentISTTimeMinutes();
  const nextLecture = todayData?.sessions.find((s) => {
    const endM = parseMinutesFromTimeString(s.endTime);
    return endM > currentMinutes && s.status !== 'present' && s.status !== 'absent';
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
          {/* Top Bar: Profile Greeting & Notification Bell */}
          <View style={styles.topBar}>
            <Pressable
              onLongPress={() => {
                toggleDemoMode();
              }}
              delayLongPress={450}
              style={({ pressed }) => (pressed ? { opacity: 0.78 } : undefined)}
              accessibilityHint="Long-press to toggle MongoDB Demo Mode"
            >
              <Text style={styles.greetingSub}>GOA COLLEGE OF ENGINEERING</Text>
              <Text style={styles.greetingName}>Hi, {userName}</Text>
              <Text style={styles.classLabel}>
                SE Sem 5 &bull; Section B &bull; Dept of Computer Eng.
              </Text>
            </Pressable>

            <View style={styles.topRightActions}>
              <Pressable
                onPress={() => router.push('/notifications' as any)}
                style={styles.notifBtn}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                    stroke="#F5F5F7"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M13.73 21a2 2 0 0 1-3.46 0"
                    stroke="#F5F5F7"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                {unreadNotifs > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadNotifs}</Text>
                  </View>
                )}
              </Pressable>

              <Pressable
                onPress={() => router.push('/profile' as any)}
                style={styles.avatarBtn}
              >
                <Text style={styles.avatarText}>
                  {userName.slice(0, 2).toUpperCase()}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Connection Error Banner */}
          {loadError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{loadError}</Text>
              <Pressable onPress={loadAll} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {/* Batch Switcher Bar */}
          <View style={styles.batchBar}>
            <Text style={styles.batchBarLabel}>Laboratory Batch:</Text>
            <View style={styles.batchToggleGroup}>
              <Pressable
                onPress={() => handleToggleBatch('C')}
                style={[styles.batchToggleBtn, batch === 'C' && styles.batchToggleActive]}
              >
                <Text style={[styles.batchToggleText, batch === 'C' && styles.batchToggleTextActive]}>
                  Batch C
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleToggleBatch('D')}
                style={[styles.batchToggleBtn, batch === 'D' && styles.batchToggleActive]}
              >
                <Text style={[styles.batchToggleText, batch === 'D' && styles.batchToggleTextActive]}>
                  Batch D
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Overall Attendance Card (Starts at 0% when empty) */}
          <Animated.View entering={FadeInUp.duration(350)} style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroLabel}>OVERALL SEMESTER ATTENDANCE</Text>
                <Text style={styles.heroPercentage}>
                  {overall && overall.hasRecords ? `${overall.percentage}%` : '0%'}
                </Text>
              </View>
              <View style={styles.heroTag}>
                <Text style={styles.heroTagText}>TARGET 75%</Text>
              </View>
            </View>

            {/* Empty state or stats numbers */}
            {!overall || !overall.hasRecords ? (
              <View style={styles.emptyNotice}>
                <Text style={styles.emptyNoticeText}>
                  No attendance marked yet. Lectures will appear according to your Sem 5 timetable.
                </Text>
              </View>
            ) : (
              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatVal}>{overall.totalClasses}</Text>
                  <Text style={styles.heroStatLbl}>Conducted</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={[styles.heroStatVal, { color: '#10B981' }]}>
                    {overall.attendedClasses}
                  </Text>
                  <Text style={styles.heroStatLbl}>Attended</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={[styles.heroStatVal, { color: '#EF4444' }]}>
                    {overall.absentClasses}
                  </Text>
                  <Text style={styles.heroStatLbl}>Absent</Text>
                </View>
              </View>
            )}

            {/* Progress bar */}
            <View style={styles.heroProgressTrack}>
              <View
                style={[
                  styles.heroProgressFill,
                  {
                    width:
                      overall && overall.hasRecords && overall.percentage !== null
                        ? `${overall.percentage}%`
                        : '0%',
                    backgroundColor:
                      overall?.risk === 'SAFE'
                        ? '#10B981'
                        : overall?.risk === 'AT_RISK'
                          ? '#F59E0B'
                          : overall?.risk === 'DEFAULTER'
                            ? '#EF4444'
                            : '#0052FF',
                  },
                ]}
              />
            </View>
          </Animated.View>

          {/* Next Upcoming Class Highlight */}
          {nextLecture && (
            <Animated.View entering={FadeInUp.delay(50).duration(300)} style={styles.nextCard}>
              <View style={styles.nextCardTop}>
                <View style={styles.nextPill}>
                  <Text style={styles.nextPillText}>NEXT UPCOMING</Text>
                </View>
                <Text style={styles.nextTime}>
                  {nextLecture.startTime} &ndash; {nextLecture.endTime}
                </Text>
              </View>
              <Text style={styles.nextTitle}>{nextLecture.subjectName}</Text>
              <Text style={styles.nextMeta}>
                {nextLecture.subjectCode} &bull; Room: {nextLecture.room} &bull;{' '}
                {nextLecture.type === 'lab' ? 'Lab' : 'Theory'}
              </Text>
            </Animated.View>
          )}

          {/* Quick Action Buttons Grid */}
          <View style={styles.quickNavGrid}>
            <Pressable
              onPress={() => router.push('/today' as any)}
              style={styles.quickNavBtn}
            >
              <Text style={styles.quickNavTitle}>Today&apos;s Classes</Text>
              <Text style={styles.quickNavSub}>
                {todayData
                  ? `${todayData.attendedClasses + todayData.absentClasses}/${todayData.totalClasses} marked`
                  : 'View'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/yesterday' as any)}
              style={styles.quickNavBtn}
            >
              <Text style={styles.quickNavTitle}>Yesterday</Text>
              <Text style={styles.quickNavSub}>Review past</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/subjects' as any)}
              style={styles.quickNavBtn}
            >
              <Text style={styles.quickNavTitle}>11 Subjects</Text>
              <Text style={styles.quickNavSub}>Theory &amp; Lab</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/monthly-reports' as any)}
              style={styles.quickNavBtn}
            >
              <Text style={styles.quickNavTitle}>Monthly Reports</Text>
              <Text style={styles.quickNavSub}>By Month</Text>
            </Pressable>
          </View>

          {/* Today's Lectures Section */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              Today&apos;s Lectures &bull; {todayData?.day}
            </Text>
            <Pressable onPress={() => router.push('/today' as any)}>
              <Text style={styles.seeAllText}>Open Today &rarr;</Text>
            </Pressable>
          </View>

          {/* Sessions List Preview */}
          {todayData?.sessions.length === 0 ? (
            <View style={styles.noClassesCard}>
              <Text style={styles.noClassesText}>No classes scheduled for today.</Text>
            </View>
          ) : (
            todayData?.sessions.map((session, index) => {
              const isPresent = session.status === 'present';
              const isAbsent = session.status === 'absent';
              const isBusy = markingId === session.id;

              return (
                <View
                  key={session.id}
                  style={[
                    styles.sessionPreviewCard,
                    isPresent && styles.previewCardPresent,
                    isAbsent && styles.previewCardAbsent,
                  ]}
                >
                  <View style={styles.previewTop}>
                    <Text style={styles.previewTime}>
                      {session.startTime} &ndash; {session.endTime}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      {session.pendingSync && (
                        <View style={styles.pendingSyncBadge}>
                          <Text style={styles.pendingSyncText}>PENDING SYNC</Text>
                        </View>
                      )}
                      <View
                        style={[
                          styles.previewTypeBadge,
                          session.type === 'lab' ? styles.badgeLab : styles.badgeTheory,
                        ]}
                      >
                        <Text style={styles.badgeText}>
                          {session.type === 'lab' ? 'LAB' : session.type === 'other' ? 'ACTIVITY' : 'THEORY'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.previewSubject}>{session.subjectName}</Text>
                  <Text style={styles.previewCode}>
                    {session.subjectCode} &bull; Room: {session.room}
                  </Text>

                  <View style={styles.previewActions}>
                    <Pressable
                      onPress={() => handleMark(session, 'present')}
                      disabled={isBusy}
                      style={[styles.pActionBtn, isPresent && styles.pActionBtnPresentActive]}
                    >
                      <Text style={[styles.pActionText, isPresent && styles.pActionTextActive]}>
                        {isPresent ? '✓ PRESENT' : 'PRESENT'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleMark(session, 'absent')}
                      disabled={isBusy}
                      style={[styles.pActionBtn, isAbsent && styles.pActionBtnAbsentActive]}
                    >
                      <Text style={[styles.pActionText, isAbsent && styles.pActionTextActive]}>
                        {isAbsent ? '✗ ABSENT' : 'ABSENT'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
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
    paddingTop: 14,
    paddingBottom: 110,
    gap: 14,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingSub: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  greetingName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F5F5F7',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  classLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.60)',
    marginTop: 2,
  },
  topRightActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  notifBtn: {
    width: 38,
    height: 38,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarBtn: {
    width: 38,
    height: 38,
    backgroundColor: '#0052FF',
    borderWidth: 1,
    borderColor: '#387BFF',
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  batchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16,20,26,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  batchBarLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  batchToggleGroup: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 0,
    overflow: 'hidden',
  },
  batchToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  batchToggleActive: {
    backgroundColor: '#0052FF',
  },
  batchToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  batchToggleTextActive: {
    color: '#FFFFFF',
  },
  heroCard: {
    backgroundColor: 'rgba(16,20,26,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 0,
    padding: 16,
    gap: 12,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  heroPercentage: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0052FF',
    letterSpacing: -1,
  },
  heroTag: {
    backgroundColor: 'rgba(0,82,255,0.15)',
    borderWidth: 1,
    borderColor: '#387BFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 0,
  },
  heroTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#387BFF',
  },
  emptyNotice: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 10,
  },
  emptyNoticeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 16,
  },
  heroStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 0,
    paddingVertical: 10,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5F5F7',
  },
  heroStatLbl: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  heroProgressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 0,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: 0,
  },
  nextCard: {
    backgroundColor: 'rgba(20,28,45,0.88)',
    borderWidth: 1,
    borderColor: '#387BFF',
    borderRadius: 0,
    padding: 14,
    gap: 4,
  },
  nextCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  nextPill: {
    backgroundColor: '#0052FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  nextPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  nextTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#387BFF',
  },
  nextTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5F5F7',
  },
  nextMeta: {
    fontSize: 11,
    color: '#A0A7B1',
  },
  quickNavGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickNavBtn: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'rgba(16,20,26,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 0,
    padding: 12,
    gap: 2,
  },
  quickNavTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F5F5F7',
  },
  quickNavSub: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F5F5F7',
    letterSpacing: 0.2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#387BFF',
  },
  noClassesCard: {
    backgroundColor: 'rgba(16,20,26,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 0,
    padding: 16,
    alignItems: 'center',
  },
  noClassesText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.60)',
  },
  sessionPreviewCard: {
    backgroundColor: 'rgba(16,20,26,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 0,
    padding: 14,
    gap: 6,
  },
  previewCardPresent: {
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  previewCardAbsent: {
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  previewTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderRadius: 0,
  },
  badgeTheory: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderColor: 'rgba(59,130,246,0.4)',
  },
  badgeLab: {
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderColor: 'rgba(168,85,247,0.4)',
  },
  pendingSyncBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    backgroundColor: 'rgba(245,158,11,0.18)',
    borderColor: '#F59E0B',
  },
  pendingSyncText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F59E0B',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewSubject: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F5F5F7',
  },
  previewCode: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  pActionBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 0,
  },
  pActionBtnPresentActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  pActionBtnAbsentActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  pActionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  pActionTextActive: {
    color: '#FFFFFF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#FCA5A5',
    fontWeight: '500',
  },
  retryBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
