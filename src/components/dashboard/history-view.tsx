import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface HistoryItem {
  id: string;
  subject: string;
  date: string;
  time: string;
  status: 'Present' | 'Absent';
  room: string;
}

const HISTORY_RECORDS: HistoryItem[] = [
  { id: '1', subject: 'Operating Systems', date: 'Today', time: '10:00 AM', status: 'Present', room: 'Hall 3B' },
  { id: '2', subject: 'DBMS', date: 'Today', time: '08:30 AM', status: 'Present', room: 'Lab 2' },
  { id: '3', subject: 'Networks', date: 'Yesterday', time: '02:00 PM', status: 'Absent', room: 'Hall 1A' },
  { id: '4', subject: 'Operating Systems', date: 'Yesterday', time: '11:15 AM', status: 'Present', room: 'Hall 3B' },
  { id: '5', subject: 'DBMS', date: '18 Nov', time: '09:00 AM', status: 'Present', room: 'Lab 2' },
];

export function HistoryView() {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Attendance History</Text>
      <Text style={styles.sectionSubtitle}>Recent session logs and swipe records</Text>

      <View style={styles.list}>
        {HISTORY_RECORDS.map((item) => (
          <View key={item.id} style={styles.card}>
            <BlurView intensity={35} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.highlight} />

            <View style={styles.row}>
              <View style={styles.leftInfo}>
                <Text style={styles.subjectText}>{item.subject}</Text>
                <Text style={styles.timeText}>
                  {item.date} · {item.time} ({item.room})
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  item.status === 'Present' ? styles.presentBadge : styles.absentBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    item.status === 'Present' ? styles.presentText : styles.absentText,
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 6,
  },
  list: {
    gap: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderTopColor: 'rgba(255, 255, 255, 0.45)',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    overflow: 'hidden',
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    zIndex: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    zIndex: 3,
  },
  leftInfo: {
    flex: 1,
    gap: 3,
  },
  subjectText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  presentBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
    borderColor: 'rgba(16, 185, 129, 0.50)',
  },
  absentBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.20)',
    borderColor: 'rgba(239, 68, 68, 0.50)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  presentText: {
    color: '#34D399',
  },
  absentText: {
    color: '#F87171',
  },
});

