import { useColorScheme, Animated, StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/colors';

type Tab = {
  name: 'home' | 'subjects' | 'calendar' | 'timetable' | 'profile';
  iconIos: string;
  iconAndroid: string;
};

const TABS: Tab[] = [
  { name: 'home', iconIos: 'house', iconAndroid: 'home' },
  { name: 'subjects', iconIos: 'book.open', iconAndroid: 'book_open' },
  { name: 'calendar', iconIos: 'calendar.badge.checkmark', iconAndroid: 'event_note' },
  { name: 'timetable', iconIos: 'clock', iconAndroid: 'schedule' },
  { name: 'profile', iconIos: 'person.circle', iconAndroid: 'person' },
];

export function BottomTabBar() {
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const colors = scheme === 'light' ? ThemeColors.light : ThemeColors.dark;

  const activeTabName = useMemo(() => {
    return (
      TABS.find((tab) => pathname === `/${tab.name}` || pathname === tab.name)?.name || 'home'
    );
  }, [pathname]);

  return (
    <View style={[styles.container, { marginBottom: Math.max(insets.bottom, 10) }]}>
      <View style={[styles.navbar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.row}>
          {TABS.map((tab) => {
            const active = activeTabName === tab.name;
            return (
              <View key={tab.name} style={styles.tabItem}>
                <Animated.View style={[styles.iconBg, active && styles.activeIconBg]}>
                  <SymbolView
                    name={tab.iconIos as any}
                    size={20}
                    tintColor={active ? '#ffffff' : colors.textMuted}
                  />
                </Animated.View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: 'auto',
    alignSelf: 'center',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 26,
    height: 56,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  row: {
    flex: 1,
    justifyContent: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  activeIconBg: {
    backgroundColor: '#2583E8',
  },
});
