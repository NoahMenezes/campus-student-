import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import { ThemeColors } from '@/constants/colors';

const BG_MAIN = '#0A0B10';

type TimetableEntry = {
  day: string;
  time: string;
  subject: string;
  code: string;
  type: 'theory' | 'lab';
  room: string;
  faculty: string;
};

const TIMETABLE: TimetableEntry[] = [
  { day: 'Monday', time: '09:00 - 10:30', subject: 'Database Management Systems', code: 'CECMP300', type: 'theory', room: 'Room 201', faculty: 'Prof. A. Sharma' },
  { day: 'Monday', time: '11:00 - 12:30', subject: 'Data Communications and Computer Networks', code: 'CECMP302', type: 'theory', room: 'Room 202', faculty: 'Prof. R. Mehta' },
  { day: 'Monday', time: '14:00 - 17:00', subject: 'Database Management Systems Lab', code: 'CECMP301', type: 'lab', room: 'Lab 3', faculty: 'Prof. A. Sharma' },
  { day: 'Tuesday', time: '09:00 - 10:30', subject: 'Artificial Intelligence', code: 'CECMP304', type: 'theory', room: 'Room 101', faculty: 'Prof. S. Patel' },
  { day: 'Tuesday', time: '11:00 - 12:30', subject: 'Design and Analysis of Algorithms', code: 'CECMP306', type: 'theory', room: 'Room 102', faculty: 'Prof. K. Verma' },
  { day: 'Tuesday', time: '14:00 - 17:00', subject: 'Artificial Intelligence Lab', code: 'CECMP305', type: 'lab', room: 'Lab 2', faculty: 'Prof. S. Patel' },
  { day: 'Wednesday', time: '09:00 - 10:30', subject: 'Soft Computing', code: 'CECMP325', type: 'theory', room: 'Room 201', faculty: 'Prof. M. Rao' },
  { day: 'Wednesday', time: '11:00 - 12:30', subject: 'Data Communications and Computer Networks', code: 'CECMP302', type: 'theory', room: 'Room 202', faculty: 'Prof. R. Mehta' },
  { day: 'Wednesday', time: '14:00 - 17:00', subject: 'Design and Analysis of Algorithms Lab', code: 'CECMP307', type: 'lab', room: 'Lab 1', faculty: 'Prof. K. Verma' },
  { day: 'Thursday', time: '09:00 - 10:30', subject: 'Database Management Systems', code: 'CECMP300', type: 'theory', room: 'Room 201', faculty: 'Prof. A. Sharma' },
  { day: 'Thursday', time: '11:00 - 12:30', subject: 'Soft Computing Lab', code: 'CECMP326', type: 'lab', room: 'Lab 3', faculty: 'Prof. M. Rao' },
  { day: 'Thursday', time: '14:00 - 15:30', subject: 'Data Communications and Computer Networks Lab', code: 'CECMP303', type: 'lab', room: 'Lab 2', faculty: 'Prof. R. Mehta' },
  { day: 'Friday', time: '09:00 - 10:30', subject: 'Artificial Intelligence', code: 'CECMP304', type: 'theory', room: 'Room 101', faculty: 'Prof. S. Patel' },
  { day: 'Friday', time: '11:00 - 12:30', subject: 'Design and Analysis of Algorithms', code: 'CECMP306', type: 'theory', room: 'Room 102', faculty: 'Prof. K. Verma' },
  { day: 'Friday', time: '14:00 - 17:00', subject: 'Soft Computing', code: 'CECMP325', type: 'theory', room: 'Room 201', faculty: 'Prof. M. Rao' },
];

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TimetableScreen() {
  const daysMap: Record<string, TimetableEntry[]> = {};
  DAYS_ORDER.forEach((day) => {
    daysMap[day] = TIMETABLE.filter((e) => e.day === day);
  });

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

          {DAYS_ORDER.map((day) => (
            <View key={day} style={styles.daySection}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>{day}</Text>
              </View>
              {daysMap[day].length === 0 ? (
                <View style={styles.emptyDay}>
                  <Text style={styles.emptyText}>No classes scheduled</Text>
                </View>
              ) : (
                daysMap[day].map((entry, idx) => (
                  <View key={idx} style={styles.classRow}>
                    <View style={styles.classTime}>{entry.time}</View>
                    <View style={styles.classInfo}>
                      <Text style={styles.classSubject}>{entry.subject}</Text>
                      <Text style={styles.classCode}>{entry.code}</Text>
                    </View>
                    <View style={styles.classDetails}>
                      <Text style={styles.classDetail}>{entry.type}</Text>
                      <Text style={styles.classDetail}>{entry.room}</Text>
                      <Text style={styles.classDetail}>{entry.faculty}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
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
});
