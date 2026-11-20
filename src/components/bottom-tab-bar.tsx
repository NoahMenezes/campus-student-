import { router, usePathname } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type Tab = {
  name: 'home' | 'subjects' | 'calendar' | 'timetable' | 'profile';
  label: string;
  route: string;
  renderIcon: (color: string) => React.ReactNode;
};

const TABS: Tab[] = [
  {
    name: 'home',
    label: 'Home',
    route: '/home',
    renderIcon: (color) => (
      <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
        <Path
          d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H4a1 1 0 0 1-1-1v-9.5z"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    ),
  },
  {
    name: 'subjects',
    label: 'Subjects',
    route: '/subjects',
    renderIcon: (color) => (
      <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
        <Path
          d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    ),
  },
  {
    name: 'calendar',
    label: 'Attendance',
    route: '/calendar',
    renderIcon: (color) => (
      <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
        <Rect
          x="3"
          y="4"
          width="18"
          height="18"
          rx="2"
          stroke={color}
          strokeWidth={2.2}
        />
        <Path
          d="M16 2v4M8 2v4M3 10h18"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M9 16l2 2 4-4"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    ),
  },
  {
    name: 'timetable',
    label: 'Timetable',
    route: '/timetable',
    renderIcon: (color) => (
      <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
        <Circle
          cx="12"
          cy="12"
          r="9"
          stroke={color}
          strokeWidth={2.2}
        />
        <Path
          d="M12 7v5l3 2"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    ),
  },
  {
    name: 'profile',
    label: 'Profile',
    route: '/profile',
    renderIcon: (color) => (
      <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
        <Circle
          cx="12"
          cy="8"
          r="4"
          stroke={color}
          strokeWidth={2.2}
        />
        <Path
          d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    ),
  },
];

export function BottomTabBar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const activeTabName = useMemo(() => {
    const path = pathname || '';
    if (path.includes('subjects')) return 'subjects';
    if (path.includes('calendar') || path.includes('attendance')) return 'calendar';
    if (path.includes('timetable')) return 'timetable';
    if (path.includes('profile')) return 'profile';
    if (path.includes('home')) return 'home';
    return 'home';
  }, [pathname]);

  const bottomInset = Math.max(insets.bottom, 12);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { paddingBottom: bottomInset }]}
    >
      <View style={styles.navbar}>
        {TABS.map((tab) => {
          const active = activeTabName === tab.name;
          const iconColor = active ? '#FFFFFF' : '#858891';

          return (
            <Pressable
              key={tab.name}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              onPress={() => {
                if (activeTabName !== tab.name) {
                  router.replace(tab.route as any);
                }
              }}
              style={({ pressed }) => [
                styles.tabItem,
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                pressed && { opacity: 0.75 },
              ]}
              hitSlop={6}
            >
              <View style={[styles.iconBg, active && styles.activeIconBg]}>
                {tab.renderIcon(iconColor)}
              </View>
            </Pressable>
          );
        })}
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
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '92%',
    maxWidth: 390,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#17181D',
    borderWidth: 1,
    borderColor: '#292B33',
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  activeIconBg: {
    backgroundColor: '#2583E8',
    shadowColor: '#2583E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
});
