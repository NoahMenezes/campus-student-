import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { AnimatedIcon } from '@/components/animated-icon';

import { GlassView } from './glass-view';

export interface GlassHeaderProps {
  style?: StyleProp<ViewStyle>;
}

export function GlassHeader({ style }: GlassHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <GlassView intensity="strong" borderRadius={40} style={styles.logoGlassWrapper}>
        <View style={styles.logoGlow} />
        <AnimatedIcon />
      </GlassView>

      <View style={styles.textContainer}>
        <Text style={styles.heading}>Welcome to Expo</Text>
        <Text style={styles.subheading}>
          Redesigned with dark aesthetic &amp; liquid glass components
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  logoGlassWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  logoGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
  },
  textContainer: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  heading: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.70)',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
  },
});
