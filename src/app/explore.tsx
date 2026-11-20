import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassNavigation } from '@/components/glass';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function TabTwoScreen() {
  return (
    <View style={styles.root}>
      {/* 9:16 Portrait Dark Forest Background */}
      <Image
        source={require('@/assets/konnakol_background.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="center"
      />

      {/* Cinematic Vignette Gradient Overlay */}
      <LinearGradient
        colors={[
          'rgba(5, 8, 15, 0.45)',
          'rgba(5, 8, 15, 0.70)',
          'rgba(5, 8, 15, 0.88)',
          'rgba(3, 5, 10, 0.96)',
        ]}
        locations={[0, 0.35, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        {/* Animated Glass Navigation Bar */}
        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.navWrapper}>
          <GlassNavigation activeTab="explore" />
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(700).delay(300)} style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Explore</Text>
            <Text style={styles.centerText}>
              This student portal includes documentation and resources for campus development.
            </Text>

            <ExternalLink href="https://docs.expo.dev" asChild>
              <Pressable style={({ pressed }) => pressed && styles.pressed}>
                <View style={styles.linkButton}>
                  <Text style={styles.linkText}>Documentation</Text>
                  <SymbolView
                    tintColor="#93c5fd"
                    name={{ ios: 'arrow.up.right.square', android: 'link', web: 'link' }}
                    size={13}
                  />
                </View>
              </Pressable>
            </ExternalLink>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(700).delay(450)} style={styles.sectionsWrapper}>
            <GlassCard intensity="default" borderRadius={0} style={styles.glassSection}>
              <GlassCardHeader>
                <GlassCardTitle>Features &amp; Architecture</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent style={styles.collapsibleList}>
                <Collapsible title="File-based routing">
                  <ThemedText type="small">
                    This app has active screens for authentication and workspace under{' '}
                    <ThemedText type="code">src/app/</ThemedText>.
                  </ThemedText>
                  <ThemedText type="small">
                    The layout file in <ThemedText type="code">src/app/_layout.tsx</ThemedText> sets up
                    the root stack navigator.
                  </ThemedText>
                  <ExternalLink href="https://docs.expo.dev/router/introduction">
                    <ThemedText type="linkPrimary">Learn more</ThemedText>
                  </ExternalLink>
                </Collapsible>

                <Collapsible title="Android, iOS, and web support">
                  <ThemedView type="backgroundElement" style={styles.collapsibleContent}>
                    <ThemedText type="small">
                      Cross-platform compatibility for Android, iOS, and Web.
                    </ThemedText>
                  </ThemedView>
                </Collapsible>

                <Collapsible title="Dark aesthetic &amp; architectural geometry">
                  <ThemedText type="small">
                    Pointed edge glass components with dark forest background photography and high-contrast
                    controls.
                  </ThemedText>
                </Collapsible>
              </GlassCardContent>
            </GlassCard>
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
  titleContainer: {
    gap: Spacing.two,
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  centerText: {
    textAlign: 'center',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.70)',
    maxWidth: 340,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.7,
  },
  linkButton: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 0,
    justifyContent: 'center',
    gap: Spacing.two,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 82, 255, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(0, 82, 255, 0.45)',
    marginTop: Spacing.two,
  },
  linkText: {
    fontSize: 13,
    color: '#93c5fd',
    fontWeight: '600',
  },
  sectionsWrapper: {
    gap: Spacing.four,
  },
  glassSection: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 0,
  },
  collapsibleList: {
    gap: Spacing.three,
  },
  collapsibleContent: {
    alignItems: 'center',
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: 0,
  },
});
