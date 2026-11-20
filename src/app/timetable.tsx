import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import { ThemeColors } from '@/constants/colors';
import { fetchTimetable } from '@/services/attendance';

const BG_MAIN = '#0A0B10';

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TimetableScreen() {
  const [daysMap, setDaysMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const data = await fetchTimetable();
        if (mounted) {
          setDaysMap(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setLoading(false);
          setError(err instanceof Error ? err.message : 'Failed to load timetable');
        }
      }
    };
    loadData();
  }, []);

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
            <Text style={styles.loadingText}>Loading timetable...</Text>
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
              <Text style={styles.headerTitle}>Weekly Timetable</Text>
              <Text style={styles.headerSubtitle}>
                Semester 5 &bull; Computer Engineering
              </Text>
            </View>
          </View>

          {DAYS_ORDER.map((day) => {
            const entries = daysMap[day] || [];
            return (
              <View key={day} style={styles.daySection}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayTitle}>{day}</Text>
                </View>
                {entries.length === 0 ? (
                  <View style={styles.emptyDay}>
                    <Text style={styles.emptyText}>No classes scheduled</Text>
                  </View>
                ) : (
                  entries.map((entry, idx) => (
                    <View key={idx} style={styles.classRow}>
                      <View style={styles.classTime}>{entry.time}</View>
                      <View style={styles.classInfo}>
                        <Text style={styles.classSubject}>{entry.subject?.name || entry.subject || 'Unknown'}</Text>
                        <Text style={styles.classCode}>{entry.subject?.code || entry.code || '—'}</Text>
                      </View>
                      <View style={styles.classDetails}>
                        <Text style={styles.classDetail}>{entry.type}</Text>
                        <Text style={styles.classDetail}>{entry.room}</Text>
                        <Text style={styles.classDetail}>{entry.faculty?.name || entry.faculty || 'TBA'}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
      <BottomTabBar />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
    gap: 16,
  },
  headerRow: {
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
  daySection: {
    backgroundColor: ThemeColors.dark.surface,
    borderWidth: 1,
    borderColor: ThemeColors.dark.border,
    borderRadius: ThemeColors.radius.none,
    overflow: 'hidden',
  },
  dayHeader: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.dark.border,
    backgroundColor: ThemeColors.dark.surfaceElevated,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F5F5F7',
  },
  classRow: {
    flexDirection: 'row',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.dark.border,
    alignItems: 'center',
  },
  classTime: {
    width: 110,
    fontSize: 13,
    fontWeight: '600',
    color: ThemeColors.dark.accent,
  },
  classInfo: {
    flex: 1,
  },
  classSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5F5F7',
  },
  classCode: {
    fontSize: 11,
    color: ThemeColors.dark.textSecondary,
    marginTop: 2,
  },
  classDetails: {
    gap: 2,
  },
  classDetail: {
    fontSize: 11,
    color: ThemeColors.dark.textMuted,
  },
  emptyDay: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: ThemeColors.dark.textMuted,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#F5F5F7',
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
});
