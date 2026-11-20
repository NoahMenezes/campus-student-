import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchAttendanceData } from '@/services/attendance';
import { getUser } from '@/services/auth';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { ThemeColors } from '@/constants/colors';

const BG_MAIN = '#0A0B10';

export default function SubjectsScreen() {
  const [data, setData] = useState<{
    subjects: any[];
    overallPercentage: number;
    attendedClasses: number;
    totalClasses: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const u = await getUser();
        const d = await fetchAttendanceData(u);
        if (mounted) {
          setData({
            subjects: d.subjects,
            overallPercentage: d.overallPercentage,
            attendedClasses: d.attendedClasses,
            totalClasses: d.totalClasses,
          });
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setLoading(false);
          setError(err instanceof Error ? err.message : 'Failed to load subjects');
        }
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const theorySubjects = data?.subjects.filter((s) => s.type === 'theory') || [];
  const labSubjects = data?.subjects.filter((s) => s.type === 'lab') || [];

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
          colors={['rgba(10,11,16,0.55)', 'rgba(24,27,36,0.85)', 'rgba(10,11,16,0.96)']}
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

  if (error) {
    return (
      <View style={styles.root}>
        <Image
          source={require('@/assets/konnakol_background.png')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition="center"
        />
        <LinearGradient
          colors={['rgba(10,11,16,0.55)', 'rgba(24,27,36,0.85)', 'rgba(10,11,16,0.96)']}
          locations={[0, 0.5, 1]}
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

  if (!data) return null;

  return (
    <View style={styles.root}>
      <Image
        source={require('@/assets/konnakol_background.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="center"
      />
      <LinearGradient
        colors={['rgba(10,11,16,0.45)', 'rgba(24,27,36,0.75)', 'rgba(10,11,16,0.94)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <View style={styles.greetingBlock}>
              <Text style={styles.headerTitle}>Subjects</Text>
              <Text style={styles.headerSubtitle}>
                Semester 5 &bull; {data.attendedClasses} of {data.totalClasses} classes
              </Text>
            </View>
            <Text style={styles.overallPct}>{data.overallPercentage}%</Text>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Theory Courses</Text>
          </View>
          {theorySubjects.map((subject) => (
            <SubjectRow key={subject.id} subject={subject} />
          ))}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lab Courses</Text>
          </View>
          {labSubjects.map((subject) => (
            <SubjectRow key={subject.id} subject={subject} />
          ))}
        </ScrollView>
      </SafeAreaView>
      <BottomTabBar />
    </View>
  );
}

function SubjectRow({ subject }: { subject: any }) {
  const isLab = subject.type === 'lab';
  const isElective = subject.category === 'elective';

  return (
    <Animated.View entering={FadeInUp.duration(500)} style={styles.subjectCard}>
      <View style={styles.subjectContent}>
        <View style={styles.subjectInfo}>
          <View style={styles.subjectMain}>
            <Text style={styles.subjectName}>{subject.name}</Text>
            <View style={styles.subjectMetaRow}>
              <Text style={styles.subjectCode}>{subject.code}</Text>
              <Text style={styles.subjectType}>
                {isLab ? 'Lab' : 'Theory'} &bull; {isElective ? 'Elective' : 'Mandatory'}
              </Text>
            </View>
          </View>
          <Text style={styles.subjectPct}>{subject.percentage}%</Text>
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${subject.percentage}%`, backgroundColor: subject.progressColor },
              ]}
            />
          </View>
          <View style={styles.progressText}>
            <Text style={styles.attendedCount}>
              {subject.attended} / {subject.total} classes
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
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
    paddingTop: 12,
    paddingBottom: 110,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
    fontSize: 13,
    color: 'rgba(245,245,247,0.55)',
    marginTop: 3,
  },
  overallPct: {
    fontSize: 20,
    fontWeight: '700',
    color: ThemeColors.dark.accent,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(245,245,247,0.65)',
    letterSpacing: 0.4,
  },
  subjectCard: {
    backgroundColor: ThemeColors.dark.surface,
    borderWidth: 1,
    borderColor: ThemeColors.dark.border,
    borderRadius: ThemeColors.radius.none,
    overflow: 'hidden',
  },
  subjectContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectMain: {
    gap: 2,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F5F5F7',
  },
  subjectMetaRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 2,
  },
  subjectCode: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  subjectType: {
    fontSize: 11,
    color: ThemeColors.dark.textSecondary,
    fontWeight: '500',
  },
  subjectPct: {
    fontSize: 16,
    fontWeight: '700',
    color: ThemeColors.dark.accent,
  },
  progressContainer: {
    width: 120,
    gap: 8,
  },
  progressTrack: {
    height: 5,
    backgroundColor: ThemeColors.dark.surfaceElevated,
    borderRadius: ThemeColors.radius.none,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: {
    height: 5,
    borderRadius: ThemeColors.radius.none,
  },
  progressText: {
    alignItems: 'center',
  },
  attendedCount: {
    fontSize: 11,
    color: ThemeColors.dark.textSecondary,
  },
});
