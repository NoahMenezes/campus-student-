import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface OverallAttendanceCardProps {
  overallPercentage: number;
  semester: string;
  attendedClasses: number;
  totalClasses: number;
}

export function OverallAttendanceCard({
  overallPercentage,
  semester,
  attendedClasses,
  totalClasses,
}: OverallAttendanceCardProps) {
  return (
    <View style={styles.cardContainer}>
      <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.highlight} />

      <View style={styles.cardContent}>
        {/* Left Section */}
        <View style={styles.leftSection}>
          <Text style={styles.attendanceLabel}>Overall attendance</Text>
          <Text style={styles.percentageText}>{overallPercentage}%</Text>
        </View>

        {/* Vertical Divider */}
        <View style={styles.verticalDivider} />

        {/* Right Section */}
        <View style={styles.rightSection}>
          <Text style={styles.semesterText}>{semester}</Text>
          <Text style={styles.classesText}>
            {attendedClasses} of {totalClasses} classes
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    borderTopColor: 'rgba(255, 255, 255, 0.50)',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.40)',
    zIndex: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 22,
    zIndex: 3,
  },
  leftSection: {
    flex: 1.2,
    justifyContent: 'center',
  },
  attendanceLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 4,
  },
  percentageText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
  },
  verticalDivider: {
    width: 1,
    height: 52,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    marginHorizontal: 16,
  },
  rightSection: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  semesterText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  classesText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.80)',
    lineHeight: 18,
  },
});

