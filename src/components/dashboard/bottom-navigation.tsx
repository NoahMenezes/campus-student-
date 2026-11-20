import { BlurView } from 'expo-blur';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type DashboardTab = 'home' | 'qr' | 'history' | 'profile';

export interface BottomNavigationProps {
  currentTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  bottomInset?: number;
}

interface TabItem {
  id: DashboardTab;
  label: string;
  icon: string;
}

const TABS: TabItem[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'qr', label: 'QR', icon: '📷' },
  { id: 'history', label: 'History', icon: '🕒' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

export function BottomNavigation({
  currentTab,
  onSelectTab,
  bottomInset = 0,
}: BottomNavigationProps) {
  return (
    <View style={[styles.floatingWrapper, { bottom: Math.max(16, bottomInset + 8) }]}>
      <View style={styles.dockContainer}>
        <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.dockHighlight} />

        <View style={styles.tabsRow}>
          {TABS.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => onSelectTab(tab.id)}
                style={[
                  styles.tabButton,
                  isActive && styles.activeTabButton,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                hitSlop={6}
              >
                <Text style={[styles.tabIcon, isActive && styles.activeTabIcon]}>
                  {tab.icon}
                </Text>
                <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 99,
  },
  dockContainer: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    borderTopColor: 'rgba(255, 255, 255, 0.50)',
    backgroundColor: 'rgba(12, 18, 36, 0.55)',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  dockHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.40)',
    zIndex: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    zIndex: 3,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 24,
    gap: 3,
  },
  activeTabButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.30)',
  },
  tabIcon: {
    fontSize: 18,
    opacity: 0.75,
  },
  activeTabIcon: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  activeTabLabel: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

