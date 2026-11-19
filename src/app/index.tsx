import * as Device from 'expo-device';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  GlassButton,
  GlassButtonGroup,
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
  GlassHeader,
  GlassNavigation,
} from '@/components/glass';
import { MaxContentWidth, Spacing } from '@/constants/theme';

function getDevMenuHint(): string {
  if (Platform.OS === 'web') {
    return 'use browser devtools';
  }
  if (Device.isDevice) {
    return 'shake device or press m in terminal';
  }
  const shortcut = Platform.OS === 'android' ? 'cmd+m (or ctrl+m)' : 'cmd+d';
  return `press ${shortcut}`;
}

export default function HomeScreen() {
  const [copiedAction, setCopiedAction] = useState<string | null>(null);

  const handleCopyCode = (text: string, label: string) => {
    setCopiedAction(label);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setTimeout(() => {
      setCopiedAction(null);
    }, 2000);
  };

  return (
    <View style={styles.root}>
      {/* 9:16 Portrait Dark Forest Background */}
      <Image
        source={require('@/assets/konnakol_background.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="center"
        priority="high"
      />

      {/* Cinematic Vignette Gradient Overlay */}
      <LinearGradient
        colors={[
          'rgba(5, 8, 15, 0.45)',
          'rgba(5, 8, 15, 0.65)',
          'rgba(5, 8, 15, 0.85)',
          'rgba(3, 5, 10, 0.95)',
        ]}
        locations={[0, 0.35, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        {/* Animated Glass Navigation Bar */}
        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.navWrapper}>
          <GlassNavigation activeTab="home" />
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Animated Hero Header with Glowing Logo & Typography */}
          <Animated.View entering={FadeInDown.duration(700).delay(350)}>
            <GlassHeader />
          </Animated.View>

          {/* Section: GET STARTED */}
          <Animated.View entering={FadeInUp.duration(700).delay(500)} style={styles.sectionHeader}>
            <View style={styles.sectionPill}>
              <View style={styles.sectionPillDot} />
              <Text style={styles.sectionTitle}>GET STARTED</Text>
            </View>
          </Animated.View>

          {/* Staggered GlassCards for Instructions */}
          <View style={styles.cardsContainer}>
            {/* 1. Try editing GlassCard */}
            <Animated.View entering={FadeInUp.duration(600).delay(600)}>
              <GlassCard intensity="default" borderRadius={20} style={styles.instructionCard}>
                <GlassCardHeader>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.badgeIndicator} />
                    <GlassCardTitle>Try editing</GlassCardTitle>
                  </View>
                  <GlassCardDescription>
                    Edit the source file to see real-time hot reloading in action
                  </GlassCardDescription>
                </GlassCardHeader>

                <GlassCardContent>
                  <View style={styles.codeRow}>
                    <View style={styles.codePill}>
                      <Text style={styles.codeText}>src/app/index.tsx</Text>
                    </View>
                    <GlassButton
                      variant="glass"
                      size="xs"
                      onPress={() => handleCopyCode('src/app/index.tsx', 'edit')}
                    >
                      {copiedAction === 'edit' ? 'Copied ✓' : 'Copy path'}
                    </GlassButton>
                  </View>
                </GlassCardContent>
              </GlassCard>
            </Animated.View>

            {/* 2. Dev tools GlassCard */}
            <Animated.View entering={FadeInUp.duration(600).delay(700)}>
              <GlassCard intensity="default" borderRadius={20} style={styles.instructionCard}>
                <GlassCardHeader>
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.badgeIndicator, { backgroundColor: '#10b981' }]} />
                    <GlassCardTitle>Dev tools</GlassCardTitle>
                  </View>
                  <GlassCardDescription>
                    Open the development menu for debugging, inspection, and reloading
                  </GlassCardDescription>
                </GlassCardHeader>

                <GlassCardContent>
                  <View style={styles.codeRow}>
                    <View style={styles.codePill}>
                      <Text style={styles.codeText}>{getDevMenuHint()}</Text>
                    </View>
                    <GlassButton variant="tinted" size="xs">
                      Active
                    </GlassButton>
                  </View>
                </GlassCardContent>
              </GlassCard>
            </Animated.View>

            {/* 3. Fresh start GlassCard */}
            <Animated.View entering={FadeInUp.duration(600).delay(800)}>
              <GlassCard intensity="default" borderRadius={20} style={styles.instructionCard}>
                <GlassCardHeader>
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.badgeIndicator, { backgroundColor: '#f59e0b' }]} />
                    <GlassCardTitle>Fresh start</GlassCardTitle>
                  </View>
                  <GlassCardDescription>
                    Reset this starter project and remove example screens
                  </GlassCardDescription>
                </GlassCardHeader>

                <GlassCardContent>
                  <View style={styles.codeRow}>
                    <View style={styles.codePill}>
                      <Text style={styles.codeText}>npm run reset-project</Text>
                    </View>
                    <GlassButton
                      variant="glass"
                      size="xs"
                      onPress={() => handleCopyCode('npm run reset-project', 'reset')}
                    >
                      {copiedAction === 'reset' ? 'Copied ✓' : 'Copy command'}
                    </GlassButton>
                  </View>
                </GlassCardContent>
              </GlassCard>
            </Animated.View>
          </View>

          {/* Footer: Version and Powered by Expo Badge */}
          <Animated.View entering={FadeIn.duration(800).delay(950)} style={styles.footerContainer}>
            <GlassButtonGroup variant="subtle" style={styles.versionButtonGroup}>
              <GlassButton variant="ghost" size="xs" disabled style={styles.versionButton}>
                <Text style={styles.versionText}>v58.0.26</Text>
              </GlassButton>
              <View style={styles.footerSeparator} />
              <GlassButton variant="ghost" size="xs" disabled style={styles.versionButton}>
                <View style={styles.poweredByRow}>
                  <Text style={styles.poweredByLabel}>Powered by</Text>
                  <Text style={styles.poweredByExpo}>Expo</Text>
                </View>
              </GlassButton>
            </GlassButtonGroup>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#05080f',
  },
  safeArea: {
    flex: 1,
  },
  navWrapper: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.four,
  },
  sectionHeader: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  sectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  sectionPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38bdf8',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 1.5,
  },
  cardsContainer: {
    gap: Spacing.three,
  },
  instructionCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38bdf8',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  codePill: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  codeText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', web: 'ui-monospace, monospace' }),
    fontSize: 12,
    color: '#e2e8f0',
  },
  footerContainer: {
    alignItems: 'center',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  versionButtonGroup: {
    padding: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.50)',
  },
  versionButton: {
    height: 28,
    paddingHorizontal: 10,
  },
  versionText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.50)',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', web: 'ui-monospace, monospace' }),
  },
  footerSeparator: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  poweredByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  poweredByLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.50)',
  },
  poweredByExpo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
});
