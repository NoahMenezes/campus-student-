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
import { getMonthlyAttendanceReport } from '@/services/attendance-manager';
import { useAttendanceLiveSync } from '@/services/attendance-stream';
import { MonthlyAttendanceReport } from '@/types/attendance';

const BG_MAIN = '#0A0B10';

interface MonthOption {
  year: number;
  month: number;
  label: string;
}

const MONTH_OPTIONS: MonthOption[] = [
  { year: 2026, month: 11, label: 'Nov 2026' },
  { year: 2026, month: 10, label: 'Oct 2026' },
  { year: 2026, month: 9, label: 'Sep 2026' },
  { year: 2026, month: 8, label: 'Aug 2026' },
];

export default function MonthlyReportsScreen() {
  const [selectedMonth, setSelectedMonth] = useState<MonthOption>(MONTH_OPTIONS[0]);
  const [report, setReport] = useState<MonthlyAttendanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReport = useCallback(async (option: MonthOption) => {
    try {
      const res = await getMonthlyAttendanceReport(option.year, option.month);
      setReport(res);
    } catch (err) {
      console.error('Failed to load monthly report:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReport(selectedMonth);
    }, [selectedMonth, loadReport])
  );

  useAttendanceLiveSync(useCallback(() => loadReport(selectedMonth), [selectedMonth, loadReport]));

  const onRefresh = () => {
    setRefreshing(true);
    loadReport(selectedMonth);
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
            <Text style={styles.subTitle}>ATTENDANCE ANALYTICS</Text>
            <Text style={styles.title}>Monthly Reports</Text>
          </View>

          {/* Month Selector Pills */}
          <View style={styles.monthPillsRow}>
            {MONTH_OPTIONS.map((opt) => {
              const isSelected =
                opt.year === selectedMonth.year && opt.month === selectedMonth.month;
              return (
                <Pressable
                  key={`${opt.year}_${opt.month}`}
                  onPress={() => setSelectedMonth(opt)}
                  style={[styles.monthPill, isSelected && styles.monthPillActive]}
                >
                  <Text style={[styles.monthPillText, isSelected && styles.monthPillTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Big Monthly Stats Card */}
          <Animated.View entering={FadeInUp.duration(350)} style={styles.metricCard}>
            <View style={styles.metricTop}>
              <Text style={styles.monthHeader}>{report?.monthName} {report?.year}</Text>
              <View style={styles.percentageBadge}>
                <Text style={styles.percentageText}>
                  {report && report.percentage !== null ? `${report.percentage}%` : '0%'}
                </Text>
              </View>
            </View>

            <View style={styles.metricGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>{report?.totalScheduled ?? 0}</Text>
                <Text style={styles.metricLbl}>Scheduled</Text>
              </View>
              <View style={styles.vDivider} />
              <View style={styles.metricItem}>
                <Text style={[styles.metricVal, { color: '#10B981' }]}>
                  {report?.attendedClasses ?? 0}
                </Text>
                <Text style={styles.metricLbl}>Present</Text>
              </View>
              <View style={styles.vDivider} />
              <View style={styles.metricItem}>
                <Text style={[styles.metricVal, { color: '#EF4444' }]}>
                  {report?.absentClasses ?? 0}
                </Text>
                <Text style={styles.metricLbl}>Absent</Text>
              </View>
              <View style={styles.vDivider} />
              <View style={styles.metricItem}>
                <Text style={[styles.metricVal, { color: '#F59E0B' }]}>
                  {report?.unmarkedClasses ?? 0}
                </Text>
                <Text style={styles.metricLbl}>Pending</Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: report && report.percentage !== null ? `${report.percentage}%` : '0%',
                    backgroundColor:
                      report && report.percentage !== null && report.percentage >= 80
                        ? '#10B981'
                        : report && report.percentage !== null && report.percentage >= 75
                          ? '#F59E0B'
                          : '#0052FF',
                  },
                ]}
              />
            </View>
          </Animated.View>

          {/* Section: Subject-wise Breakdown for Month */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Subject Breakdown &bull; {report?.monthName}
            </Text>
          </View>

          {report?.subjects.map((subj, index) => (
            <Animated.View
              key={subj.code}
              entering={FadeInUp.delay(index * 25).duration(300)}
              style={styles.subjectRowCard}
            >
              <View style={styles.subjLeft}>
                <View style={styles.codeRow}>
                  <Text style={styles.subjCode}>{subj.code}</Text>
                  <View
                    style={[
                      styles.typeBadge,
                      subj.type === 'lab' ? styles.typeBadgeLab : styles.typeBadgeTheory,
                    ]}
                  >
                    <Text style={styles.typeBadgeText}>
                      {subj.type === 'lab'
                        ? 'LAB'
                        : subj.type === 'other'
                          ? 'ACTIVITY'
                          : 'THEORY'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.subjName}>{subj.name}</Text>
              </View>

              <View style={styles.subjRight}>
                <Text
                  style={[
                    styles.subjPct,
                    {
                      color:
                        subj.total === 0 || subj.percentage === null
                          ? '#9CA3AF'
                          : subj.percentage >= 80
                            ? '#10B981'
                            : subj.percentage >= (subj.minAttendance ?? 75)
                              ? '#F59E0B'
                              : '#EF4444',
                    },
                  ]}
                >
                  {subj.total === 0 || subj.percentage === null ? '--' : `${subj.percentage}%`}
                </Text>
                <Text style={styles.subCount}>
                  {subj.attended}/{subj.total}
                  {typeof subj.pending === 'number' ? ` (${subj.pending} pend)` : ''}
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
    gap: 14,
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
  monthPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  monthPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,24,30,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 0,
  },
  monthPillActive: {
    backgroundColor: '#0052FF',
    borderColor: '#387BFF',
  },
  monthPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  monthPillTextActive: {
    color: '#FFFFFF',
  },
  metricCard: {
    backgroundColor: 'rgba(16,20,26,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 0,
    padding: 16,
    gap: 14,
  },
  metricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5F5F7',
  },
  percentageBadge: {
    backgroundColor: 'rgba(0,82,255,0.15)',
    borderWidth: 1,
    borderColor: '#387BFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 0,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#387BFF',
  },
  metricGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 0,
    paddingVertical: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F5F5F7',
  },
  metricLbl: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    marginTop: 2,
  },
  vDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.10)',
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
  sectionHeader: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(245,245,247,0.70)',
    letterSpacing: 0.3,
  },
  subjectRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(16,20,26,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 0,
    padding: 14,
  },
  subjLeft: {
    flex: 1,
    gap: 3,
    paddingRight: 12,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subjCode: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A0A7B1',
    letterSpacing: 0.5,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
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
  subjName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5F5F7',
  },
  subjRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  subjPct: {
    fontSize: 16,
    fontWeight: '700',
  },
  subCount: {
    fontSize: 11,
    color: '#9CA3AF',
  },
});
