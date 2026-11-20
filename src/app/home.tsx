import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import { GlassButton, GlassCard, GlassCardContent } from '@/components/glass';
import { fetchAttendanceData, type AttendanceData } from '@/services/attendance';
import { getUser } from '@/services/auth';

const BG_MAIN = '#090A0C';
const SAGE = '#8A9A7B';
const AMBER = '#C9A227';
const DUSTY_RED = '#B55A5A';
const PROGRESS_TRACK = '#292D33';

export default function HomeScreen() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getUser();
      if (mounted) setUser(u);
      const d = await fetchAttendanceData(u);
      if (mounted) {
        setData(d);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading || !data || !user) {
    return (
      <View style={styles.root}>
        <Image
          source={require('@/assets/konnakol_background.png')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition="center"
        />
        <LinearGradient
          colors={['rgba(9,10,12,0.55)', 'rgba(16,18,22,0.85)', 'rgba(9,10,12,0.96)']}
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

  const pctColor =
    data.overallPercentage >= 80 ? SAGE : data.overallPercentage >= 75 ? AMBER : DUSTY_RED;

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
        >
          <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.headerRow}>
            <View style={styles.greetingBlock}>
              <Text style={styles.greeting}>
                Good {getDayPart()}, {user?.name?.split(' ')[0] || 'Student'}
              </Text>
              <Text style={styles.subtitle}>
                {data?.semester || 'Semester 5'} &bull; Campus Attendance
              </Text>
            </View>
            <GlassButton variant="outline" size="sm" onPress={() => { }}>
              <Text style={styles.navText}>Notifications</Text>
            </GlassButton>
          </Animated.View>

          {data?.warning ? (
            <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.warningRow}>
              <GlassCard intensity="default" borderRadius={0} style={styles.warningCard}>
                <GlassCardContent style={styles.warningContent}>
                  <View style={styles.warningIndicator}>
                    <View style={styles.indicatorDot} />
                  </View>
                  <View style={styles.warningTextBlock}>
                    <Text style={styles.warningText}>{data.warning.message}</Text>
                  </View>
                </GlassCardContent>
              </GlassCard>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.overviewCard}>
            <GlassCard intensity="strong" borderRadius={0} style={styles.overviewCardStyle}>
              <GlassCardContent style={styles.overviewContent}>
                <View style={styles.overviewHeader}>
                  <Text style={styles.overviewLabel}>Overall Attendance</Text>
                  <Text style={styles.overviewSemester}>
                    {data.semester} &bull; {data.attendedClasses} of {data.totalClasses} classes
                  </Text>
                </View>
                <View style={styles.bigPctContainer}>
                  <Text style={[styles.bigPct, { color: pctColor }]}>
                    {data.overallPercentage}%
                  </Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${data.overallPercentage}%`,
                          backgroundColor: pctColor,
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.overviewStatsRow}>
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>{data.attendedClasses}</Text>
                    <Text style={styles.statLabel}>Attended</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>{data.totalClasses - data.attendedClasses}</Text>
                    <Text style={styles.statLabel}>Missed</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>{data.totalClasses}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                </View>
              </GlassCardContent>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(500)} style={styles.subjectsHeader}>
            <Text style={styles.sectionTitle}>Subject Attendance</Text>
          </Animated.View>

          {data?.subjects.map((subject, i) => (
            <Animated.View
              key={subject.id}
              entering={FadeInUp.duration(500).delay(600 + i * 80)}
              style={styles.subjectCardContainer}
            >
              <GlassCard intensity="default" borderRadius={0} style={styles.subjectCard}>
                <GlassCardContent style={styles.subjectCardContent}>
                  <View style={styles.subjectHeaderRow}>
                    <View style={styles.subjectInfo}>
                      <Text style={styles.subjectName}>{subject.name}</Text>
                      <Text style={styles.subjectCode}>{subject.code}</Text>
                    </View>
                    <Text style={[styles.subjectPct, { color: getPctColor(subject.percentage) }]}>
                      {subject.percentage}%
                    </Text>
                  </View>
                  <View style={styles.subjectProgressContainer}>
                    <View style={styles.subjectProgressTrack}>
                      <View
                        style={[
                          styles.subjectProgressFill,
                          {
                            width: `${subject.percentage}%`,
                            backgroundColor: getPctColor(subject.percentage),
                          },
                        ]}
                      />
                    </View>
                  </View>
                </GlassCardContent>
              </GlassCard>
            </Animated.View>
          ))}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
      <BottomTabBar />
    </View>
  );
}

function getDayPart() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

function getPctColor(pct: number) {
  if (pct >= 80) return SAGE;
  if (pct >= 75) return AMBER;
  return DUSTY_RED;
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
    paddingBottom: 110,
    gap: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingBlock: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F0F0F0',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.60)',
    marginTop: 3,
    letterSpacing: 0.2,
  },
  navText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  warningRow: {
    marginBottom: 16,
  },
  warningCard: {
    borderRadius: 0,
    borderLeftWidth: 2,
    borderLeftColor: AMBER,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
  },
  warningIndicator: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AMBER,
  },
  warningTextBlock: {
    flex: 1,
  },
  warningText: {
    fontSize: 13,
    color: '#F0F0F0',
    lineHeight: 18,
    fontWeight: '500',
  },
  overviewCard: {
    marginBottom: 20,
  },
  overviewCardStyle: {
    borderRadius: 0,
  },
  overviewContent: {
    padding: 20,
  },
  overviewHeader: {
    gap: 4,
    marginBottom: 16,
  },
  overviewLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F0F0F0',
  },
  overviewSemester: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  bigPctContainer: {
    marginTop: 6,
  },
  bigPct: {
    fontSize: 48,
    fontWeight: '700',
    color: '#F0F0F0',
    letterSpacing: -1,
  },
  progressTrack: {
    height: 4,
    backgroundColor: PROGRESS_TRACK,
    borderRadius: 0,
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: {
    height: 4,
    borderRadius: 0,
  },
  overviewStatsRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    height: 16,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F0F0F0',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 2,
  },
  subjectsHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.70)',
    letterSpacing: 0.3,
  },
  subjectCardContainer: {
    width: '100%',
  },
  subjectCard: {
    borderRadius: 0,
  },
  subjectCardContent: {
    padding: 16,
  },
  subjectHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F0F0F0',
  },
  subjectCode: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 1,
  },
  subjectPct: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F0F0F0',
  },
  subjectProgressContainer: {
    height: 3,
  },
  subjectProgressTrack: {
    height: 3,
    backgroundColor: PROGRESS_TRACK,
    borderRadius: 0,
    overflow: 'hidden',
  },
  subjectProgressFill: {
    height: 3,
    borderRadius: 0,
  },
  bottomSpacer: {
    height: 20,
  },
});
