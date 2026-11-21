import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import { getStudentBatch, setStudentBatch } from '@/services/attendance-manager';
import {
  getCurrentISTTimeMinutes,
  getDayOfWeekFromDate,
  getSlotsForDayAndBatch,
  parseMinutesFromTimeString,
} from '@/services/timetable';
import { DayOfWeek, LabBatch, TimetableSlot } from '@/types/attendance';

const BG_MAIN = '#0A0B10';
const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TimetableScreen() {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(
    () => getDayOfWeekFromDate(new Date()) || 'Monday'
  );
  const [batch, setBatch] = useState<LabBatch>('C');
  const [slots, setSlots] = useState<TimetableSlot[]>([]);

  useEffect(() => {
    getStudentBatch().then(setBatch);
  }, []);

  const loadSlots = useCallback((day: DayOfWeek, b: LabBatch) => {
    const list = getSlotsForDayAndBatch(day, b);
    setSlots(list);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSlots(selectedDay, batch);
  }, [selectedDay, batch, loadSlots]);

  const handleToggleBatch = async (newBatch: LabBatch) => {
    setBatch(newBatch);
    await setStudentBatch(newBatch);
    loadSlots(selectedDay, newBatch);
  };

  const currentISTMinutes = getCurrentISTTimeMinutes();
  const todayDay = getDayOfWeekFromDate(new Date());

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
        >
          {/* Top Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>College Timetable</Text>
              <Text style={styles.headerSubtitle}>
                SE Sem 5 &bull; Section B &bull; Dept of Computer Eng.
              </Text>
            </View>

            {/* Batch C / D Switcher */}
            <View style={styles.batchContainer}>
              <Pressable
                onPress={() => handleToggleBatch('C')}
                style={[styles.batchBtn, batch === 'C' && styles.batchBtnActive]}
              >
                <Text style={[styles.batchText, batch === 'C' && styles.batchTextActive]}>
                  Batch C
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleToggleBatch('D')}
                style={[styles.batchBtn, batch === 'D' && styles.batchBtnActive]}
              >
                <Text style={[styles.batchText, batch === 'D' && styles.batchTextActive]}>
                  Batch D
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Day Selector Pills */}
          <View style={styles.daysRow}>
            {DAYS.map((d) => {
              const isSelected = selectedDay === d;
              const isToday = todayDay === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => setSelectedDay(d)}
                  style={[
                    styles.dayPill,
                    isSelected && styles.dayPillActive,
                    isToday && !isSelected && styles.dayPillToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextActive,
                      isToday && !isSelected && styles.dayTextToday,
                    ]}
                  >
                    {d.slice(0, 3).toUpperCase()}
                  </Text>
                  {isToday && <View style={styles.todayDot} />}
                </Pressable>
              );
            })}
          </View>

          {/* Schedule List */}
          <View style={styles.timelineContainer}>
            {slots.map((slot, index) => {
              const startMin = parseMinutesFromTimeString(slot.startTime);
              const endMin = parseMinutesFromTimeString(slot.endTime);
              const isToday = todayDay === selectedDay;
              const isOngoing = isToday && currentISTMinutes >= startMin && currentISTMinutes <= endMin;
              const isPast = isToday && currentISTMinutes > endMin;

              return (
                <Animated.View
                  key={slot.id}
                  entering={FadeInUp.delay(index * 30).duration(300)}
                  style={[
                    styles.slotCard,
                    isOngoing && styles.slotCardOngoing,
                    isPast && styles.slotCardPast,
                  ]}
                >
                  <View style={styles.timeColumn}>
                    <Text style={[styles.timeText, isOngoing && styles.timeTextOngoing]}>
                      {slot.startTime}
                    </Text>
                    <View style={styles.timeLine} />
                    <Text style={styles.timeTextEnd}>{slot.endTime}</Text>
                  </View>

                  <View style={styles.slotDetails}>
                    <View style={styles.slotTop}>
                      <Text style={styles.slotCode}>{slot.subjectCode}</Text>
                      <View
                        style={[
                          styles.typeBadge,
                          slot.type === 'lab' ? styles.typeBadgeLab : styles.typeBadgeTheory,
                        ]}
                      >
                        <Text style={styles.typeBadgeText}>
                          {slot.type === 'lab' ? 'LAB' : slot.type === 'other' ? 'ACTIVITY' : 'THEORY'}
                        </Text>
                      </View>
                      {slot.batch !== 'all' && (
                        <View style={styles.batchTag}>
                          <Text style={styles.batchTagText}>Batch {slot.batch}</Text>
                        </View>
                      )}
                      {isOngoing && (
                        <View style={styles.ongoingBadge}>
                          <Text style={styles.ongoingText}>ONGOING</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.slotSubject}>{slot.subjectName}</Text>

                    <View style={styles.slotBottom}>
                      <Text style={styles.roomText}>Room: {slot.room}</Text>
                    </View>
                  </View>
                </Animated.View>
              );
            })}

            {/* Lunch Break Notice */}
            <View style={styles.breakCard}>
              <Text style={styles.breakTime}>01:15 PM – 02:00 PM</Text>
              <Text style={styles.breakText}>Lunch Break (45 mins)</Text>
            </View>
          </View>
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
    paddingTop: 16,
    paddingBottom: 110,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
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
  batchContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 0,
    overflow: 'hidden',
  },
  batchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  batchBtnActive: {
    backgroundColor: '#0052FF',
  },
  batchText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  batchTextActive: {
    color: '#FFFFFF',
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,24,30,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 0,
    position: 'relative',
  },
  dayPillActive: {
    backgroundColor: '#0052FF',
    borderColor: '#387BFF',
  },
  dayPillToday: {
    borderColor: 'rgba(56,123,255,0.5)',
  },
  dayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  dayTextToday: {
    color: '#387BFF',
  },
  todayDot: {
    position: 'absolute',
    bottom: 3,
    width: 3,
    height: 3,
    backgroundColor: '#387BFF',
  },
  timelineContainer: {
    gap: 10,
  },
  slotCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16,20,26,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 0,
    padding: 14,
    gap: 14,
  },
  slotCardOngoing: {
    borderColor: '#0052FF',
    backgroundColor: 'rgba(0,82,255,0.10)',
  },
  slotCardPast: {
    opacity: 0.65,
  },
  timeColumn: {
    alignItems: 'center',
    width: 52,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F5F5F7',
  },
  timeTextOngoing: {
    color: '#387BFF',
  },
  timeLine: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.20)',
    marginVertical: 4,
  },
  timeTextEnd: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  slotDetails: {
    flex: 1,
    gap: 4,
  },
  slotTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  slotCode: {
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
  batchTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: 'rgba(245,158,11,0.4)',
    borderWidth: 1,
    borderRadius: 0,
  },
  batchTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F59E0B',
  },
  ongoingBadge: {
    backgroundColor: 'rgba(0,82,255,0.25)',
    borderColor: '#387BFF',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 0,
  },
  ongoingText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#387BFF',
  },
  slotSubject: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F5F5F7',
  },
  slotBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  roomText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  breakCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
    borderRadius: 0,
    padding: 12,
    alignItems: 'center',
    gap: 2,
    marginTop: 6,
  },
  breakTime: {
    fontSize: 11,
    color: '#A0A7B1',
    fontWeight: '600',
  },
  breakText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});
