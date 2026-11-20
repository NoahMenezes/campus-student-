import { router, usePathname } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass/glass-button';
import { GlassView } from '@/components/glass/glass-view';

type Tab = {
  name: 'home' | 'qr-scanner' | 'attendance-history' | 'profile';
  label: string;
  iconIos: string;
  iconAndroid: string;
};

const TABS: Tab[] = [
  { name: 'home', label: 'Home', iconIos: 'house', iconAndroid: 'home' },
  { name: 'qr-scanner', label: 'Scan', iconIos: 'qrcode', iconAndroid: 'qr-code' },
  { name: 'attendance-history', label: 'History', iconIos: 'clock', iconAndroid: 'history' },
  { name: 'profile', label: 'Profile', iconIos: 'user', iconAndroid: 'account-circle' },
];

export function BottomTabBar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <GlassView intensity="strong" borderRadius={0} style={styles.navbar}>
        <View style={styles.row}>
          {TABS.map((tab) => {
            const active = pathname === `/${tab.name}` || pathname === tab.name;
            return (
              <View key={tab.name} style={styles.tabItem}>
                <GlassButton
                  variant={active ? 'default' : 'ghost'}
                  size="icon"
                  active={active}
                  onPress={() => {
                    if (!active) {
                      router.replace(`/${tab.name}` as any);
                    }
                  }}
                >
                  <SymbolView
                    name={tab.iconIos as any}
                    size={20}
                    tintColor={active ? '#ffffff' : 'rgba(255,255,255,0.45)'}
                  />
                </GlassButton>
              </View>
            );
          })}
        </View>
      </GlassView>
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
    zIndex: 50,
  },
  navbar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
    borderRadius: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
