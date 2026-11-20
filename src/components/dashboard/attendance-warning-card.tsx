import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface AttendanceWarningCardProps {
  message: string;
}

export function AttendanceWarningCard({ message }: AttendanceWarningCardProps) {
  if (!message) return null;

  return (
    <View style={styles.bannerContainer}>
      <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.amberHighlight} />

      <View style={styles.row}>
        {/* Amber Alert Indicator */}
        <View style={styles.iconContainer}>
          <Text style={styles.alertIcon}>⚠️</Text>
        </View>

        <Text style={styles.messageText}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    borderTopColor: 'rgba(245, 158, 11, 0.65)',
    backgroundColor: 'rgba(15, 20, 32, 0.50)',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  amberHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(245, 158, 11, 0.55)',
    zIndex: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    zIndex: 3,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIcon: {
    fontSize: 16,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#ffffff',
    lineHeight: 18,
    letterSpacing: 0.1,
  },
});
