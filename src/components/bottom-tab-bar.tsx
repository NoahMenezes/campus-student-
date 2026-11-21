import { router, usePathname } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type Tab = {
  name: string;
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
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path
          d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H4a1 1 0 0 1-1-1v-9.5z"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    ),
  },
  {
    name: 'today',
    label: 'Today',
    route: '/today',
    renderIcon: (color) => (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Rect x={3} y={4} width={18} height={18} rx={0} stroke={color} strokeWidth={2} />
        <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={2} strokeLinecap="round" />
        <Path d="M9 15l2 2 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
  },
  {
    name: 'subjects',
    label: 'Subjects',
    route: '/subjects',
    renderIcon: (color) => (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path
          d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    ),
  },
  {
    name: 'reports',
    label: 'Reports',
    route: '/monthly-reports',
    renderIcon: (color) => (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M18 20V10M12 20V4M6 20v-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
  },
  {
    name: 'timetable',
    label: 'Timetable',
    route: '/timetable',
    renderIcon: (color) => (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
        <Path d="M12 6v6l4 2" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    ),
  },
];

export function BottomTabBar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const getIsActive = (tab: Tab) => {
    if (tab.name === 'home') return pathname === '/home' || pathname === '/';
    if (tab.name === 'today') return pathname === '/today';
    if (tab.name === 'subjects') return pathname === '/subjects';
    if (tab.name === 'reports') return pathname === '/monthly-reports' || pathname === '/calendar';
    if (tab.name === 'timetable') return pathname === '/timetable';
    return false;
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.navbar}>
        {TABS.map((tab) => {
          const active = getIsActive(tab);
          const iconColor = active ? '#387BFF' : '#858891';

          return (
            <Pressable
              key={tab.name}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              onPress={() => {
                if (!active) {
                  router.replace(tab.route as any);
                }
              }}
              style={({ pressed }) => [
                styles.tabItem,
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                pressed && { opacity: 0.75 },
              ]}
              hitSlop={8}
            >
              <View style={[styles.iconWrapper, active && styles.activeIconWrapper]}>
                {tab.renderIcon(iconColor)}
              </View>
              <Text style={[styles.tabLabel, active && styles.activeTabLabel]}>
                {tab.label}
              </Text>
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
    width: '100%',
    zIndex: 999,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    maxWidth: 440,
    height: 56,
    backgroundColor: 'rgba(15,18,24,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 0,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconWrapper: {
    transform: [{ scale: 1.05 }],
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#858891',
    letterSpacing: 0.2,
  },
  activeTabLabel: {
    color: '#387BFF',
    fontWeight: '700',
  },
});
