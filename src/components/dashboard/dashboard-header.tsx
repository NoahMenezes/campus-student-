import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface DashboardHeaderProps {
  userName: string;
  onNotificationPress?: () => void;
  hasUnreadNotifications?: boolean;
}

export function DashboardHeader({
  userName,
  onNotificationPress,
  hasUnreadNotifications = true,
}: DashboardHeaderProps) {
  const firstName = userName ? userName.trim().split(' ')[0] : 'Student';

  return (
    <View style={styles.header}>
      <View style={styles.greetingContainer}>
        <Text style={styles.greeting}>Hi, {firstName}</Text>
      </View>

      <Pressable
        onPress={onNotificationPress}
        style={({ pressed }) => [styles.notificationButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        hitSlop={8}
      >
        {/* Crisp Notification Bell Icon SVG / Vector */}
        <View style={styles.bellIconWrapper}>
          <Text style={styles.bellIcon}>🔔</Text>
        </View>

        {hasUnreadNotifications && <View style={styles.unreadDot} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    borderTopColor: 'rgba(255, 255, 255, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  bellIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    fontSize: 18,
    color: '#ffffff',
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
});

