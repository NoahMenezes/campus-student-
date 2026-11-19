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
              This starter app includes example code to help you get started.
            </Text>

            <ExternalLink href="https://docs.expo.dev" asChild>
              <Pressable style={({ pressed }) => pressed && styles.pressed}>
                <View style={styles.linkButton}>
                  <Text style={styles.linkText}>Expo documentation</Text>
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
            <GlassCard intensity="default" borderRadius={20} style={styles.glassSection}>
              <GlassCardHeader>
                <GlassCardTitle>Features &amp; Architecture</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent style={styles.collapsibleList}>
                <Collapsible title="File-based routing">
                  <ThemedText type="small">
                    This app has two screens: <ThemedText type="code">src/app/index.tsx</ThemedText> and{' '}
                    <ThemedText type="code">src/app/explore.tsx</ThemedText>
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
                      You can open this project on Android, iOS, and the web. To open the web version,
                      press <ThemedText type="smallBold">w</ThemedText> in the terminal running this
                      project.
                    </ThemedText>
                    <Image
                      source={require('@/assets/images/tutorial-web.png')}
                      style={styles.imageTutorial}
                    />
                  </ThemedView>
                </Collapsible>

                <Collapsible title="Images">
                  <ThemedText type="small">
                    For static images, you can use the <ThemedText type="code">@2x</ThemedText> and{' '}
                    <ThemedText type="code">@3x</ThemedText> suffixes to provide files for different
                    screen densities.
                  </ThemedText>
                  <Image source={require('@/assets/images/react-logo.png')} style={styles.imageReact} />
                  <ExternalLink href="https://reactnative.dev/docs/images">
                    <ThemedText type="linkPrimary">Learn more</ThemedText>
                  </ExternalLink>
                </Collapsible>

                <Collapsible title="Dark aesthetic &amp; Liquid glass">
                  <ThemedText type="small">
                    This screen uses glassmorphism components powered by{' '}
                    <ThemedText type="code">expo-blur</ThemedText> and custom GlassCN design tokens
                    with dark forest background photography.
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
    borderRadius: Spacing.five,
    justifyContent: 'center',
    gap: Spacing.two,
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
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
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  collapsibleList: {
    gap: Spacing.three,
  },
  collapsibleContent: {
    alignItems: 'center',
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  imageTutorial: {
    width: '100%',
    aspectRatio: 296 / 171,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  imageReact: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginVertical: Spacing.two,
  },
});
