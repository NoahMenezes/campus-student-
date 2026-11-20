import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import { ThemeColors } from '@/constants/colors';
import { fetchAttendanceHistory } from '@/services/attendance';

const BG_MAIN = '#0A0B10';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type DayStatus = 'present' | 'absent' | 'holiday' | 'none';

interface CalendarDay {
  date: number;
  status: DayStatus;
}

const generateEmptyCalendar = (): CalendarDay[] => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: CalendarDay[] = [];
  for (let i = 0; i < firstDay; i++) days.push({ date: 0, status: 'none' });
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: d, status: 'none' });
  }
  return days;
};

const statusColors: Record<DayStatus, string> = {
  present: ThemeColors.dark.success,
  absent: ThemeColors.dark.danger,
  holiday: ThemeColors.dark.textMuted,
  none: ThemeColors.dark.border,
};

const statusLabels: Record<DayStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  holiday: 'Holiday',
  none: '—',
};

export default function CalendarScreen() {
  const [days, setDays] = useState<CalendarDay[]>(generateEmptyCalendar());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const currentDay = now.getDate();

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const records = await fetchAttendanceHistory();
        if (mounted) {
          const dayMap = new Map<number, DayStatus>();
          records.forEach((r) => {
            const d = new Date(r.date);
            const dayNum = d.getDate();
            const status = r.status === 'Present' ? 'present' : r.status === 'Absent' ? 'absent' : 'none';
            dayMap.set(dayNum, status);
          });

          setDays((prev) =>
            prev.map((d) => ({
              ...d,
              status: d.date !== 0 && dayMap.has(d.date) ? dayMap.get(d.date)! : 'none',
            }))
          );
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setLoading(false);
          setError(err instanceof Error ? err.message : 'Failed to load calendar data');
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
            <Text style={styles.loadingText}>Loading calendar...</Text>
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

  const dayEntry = days.find((d) => d.date === selectedDate);

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
              <Text style={styles.headerTitle}>Attendance Calendar</Text>
              <Text style={styles.headerSubtitle}>
                Monthly attendance overview for Semester 5
              </Text>
            </View>
          </View>

          <View style={styles.monthHeader}>
            <Text style={styles.monthTitle}>
              {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </Text>
          </View>

          <View style={styles.weekdayRow}>
            {DAYS.map((day) => (
              <View key={day} style={styles.weekdayCell}>
                <Text style={styles.weekdayText}>{day}</Text>
              </View>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {days.map((day) => {
              const isToday = day.date === currentDay;
              const isSelected = selectedDate === day.date;
              const isEmpty = day.date === 0;

              if (isEmpty) return <View key={day.date} style={styles.emptyCell} />;

              return (
                <TouchableOpacity
                  key={day.date}
                  style={[
                    styles.dayCell,
                    isToday && styles.todayCell,
                    isSelected && styles.selectedCell,
                    day.status !== 'none' && styles.hasStatusCell,
                  ]}
                  onPress={() => setSelectedDate(day.date)}
                >
                  <Text style={[styles.dayNumber, isToday && styles.todayNumber]}>
                    {day.date}
                  </Text>
                  {day.status !== 'none' && (
                    <View style={[styles.statusDot, { backgroundColor: statusColors[day.status] }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedDate !== null && (
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>Selected Date</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>
                  {new Date(now.getFullYear(), now.getMonth(), selectedDate).toLocaleDateString(
                    undefined,
                    { weekday: 'long', month: 'short', day: 'numeric' },
                  )}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <View style={styles.detailStatusRow}>
                  <View style={[styles.statusDot, { backgroundColor: statusColors[dayEntry?.status || 'none'] }]} />
                  <Text style={styles.detailValue}>
                    {statusLabels[dayEntry?.status || 'none']}
                  </Text>
                </View>
              </View>
            </View>
          )}
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
  monthHeader: {
    marginBottom: 12,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F5F7',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '600',
    color: ThemeColors.dark.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  emptyCell: {
    width: '14.28%',
    height: 44,
  },
  dayCell: {
    width: '14.28%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ThemeColors.dark.border,
    borderRadius: ThemeColors.radius.none,
    backgroundColor: ThemeColors.dark.surface,
  },
  todayCell: {
    borderColor: ThemeColors.dark.accent,
    backgroundColor: ThemeColors.dark.accentSurface,
  },
  selectedCell: {
    backgroundColor: ThemeColors.dark.accent,
    borderColor: ThemeColors.dark.accent,
  },
  hasStatusCell: {
    position: 'relative',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5F5F7',
  },
  todayNumber: {
    color: ThemeColors.dark.accent,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    bottom: 6,
    right: 6,
  },
  detailCard: {
    backgroundColor: ThemeColors.dark.surface,
    borderWidth: 1,
    borderColor: ThemeColors.dark.border,
    borderRadius: ThemeColors.radius.none,
    padding: 16,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F5F5F7',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.dark.border,
  },
  detailLabel: {
    fontSize: 13,
    color: ThemeColors.dark.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#F5F5F7',
  },
  detailStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
