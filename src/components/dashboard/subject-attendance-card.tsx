import { BlurView } from 'expo-blur';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export interface SubjectAttendanceCardProps {
  name: string;
  percentage: number;
  progressColor: string;
}

export function SubjectAttendanceCard({
  name,
  percentage,
  progressColor,
}: SubjectAttendanceCardProps) {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.min(100, Math.max(0, percentage)), {
      duration: 900,
    });
  }, [percentage, animatedProgress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%`,
  }));

  return (
    <View style={styles.cardContainer}>
      <BlurView intensity={35} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.highlight} />

      <View style={styles.cardContent}>
        {/* Top Info Row */}
        <View style={styles.infoRow}>
          <Text style={styles.subjectName}>{name}</Text>
          <Text style={styles.percentageText}>{percentage}%</Text>
        </View>

        {/* Progress Bar Track */}
        <View style={styles.progressBarTrack}>
          <Animated.View
            style={[
              styles.progressBarFill,
              { backgroundColor: progressColor },
              progressStyle,
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderTopColor: 'rgba(255, 255, 255, 0.45)',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
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
  cardContent: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 12,
    zIndex: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  progressBarTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
