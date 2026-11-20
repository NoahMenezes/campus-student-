import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { ExternalLink } from '@/components/external-link';

import { GlassButton } from './glass-button';
import { GlassButtonGroup } from './glass-button-group';
import { GlassView } from './glass-view';

export interface GlassNavigationProps {
  activeTab?: 'home' | 'explore';
  style?: StyleProp<ViewStyle>;
}

export function GlassNavigation({ activeTab = 'home', style }: GlassNavigationProps) {
  return (
    <GlassView intensity="strong" borderRadius={0} style={[styles.navbar, style]}>
      <View style={styles.brandContainer}>
        <Text style={styles.brandText}>Konnakol</Text>
      </View>

      <GlassButtonGroup variant="subtle" style={styles.navGroup}>
        <GlassButton
          variant={activeTab === 'home' ? 'default' : 'ghost'}
          size="xs"
          active={activeTab === 'home'}
          onPress={() => router.push('/')}
        >
          Home
        </GlassButton>

        <GlassButton
          variant={activeTab === 'explore' ? 'default' : 'ghost'}
          size="xs"
          active={activeTab === 'explore'}
          onPress={() => router.push('/explore')}
        >
          Explore
        </GlassButton>

        <ExternalLink href="https://docs.expo.dev" asChild>
          <GlassButton variant="ghost" size="xs">
            <View style={styles.docsButtonContent}>
              <Text style={styles.docsText}>Docs</Text>
              <SymbolView
                name={{ ios: 'arrow.up.right.square', android: 'link', web: 'link' }}
                size={11}
                tintColor="#cbd5e1"
              />
            </View>
          </GlassButton>
        </ExternalLink>
      </GlassButtonGroup>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    borderRadius: 0,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  navGroup: {
    padding: 2,
    borderRadius: 0,
  },
  docsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  docsText: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '500',
  },
});
