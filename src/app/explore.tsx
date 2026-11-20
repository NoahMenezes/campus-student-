import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { BottomTabBar } from '@/components/bottom-tab-bar';

export default function TabTwoScreen() {
  return (
    <View style={styles.root}>
      <Image
        source={require('@/assets/konnakol_background.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="center"
      />

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
        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.navWrapper} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(700).delay(300)} style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Explore</Text>
            <Text style={styles.centerText}>
              Campus Attendance Management - Semester 5
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

          <BottomTabBar />
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 110,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    gap: 24,
  },
  titleContainer: {
    gap: 16,
    alignItems: 'center',
    paddingVertical: 32,
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 0,
    justifyContent: 'center',
    gap: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 82, 255, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(0, 82, 255, 0.45)',
    marginTop: 16,
  },
  linkText: {
    fontSize: 13,
    color: '#93c5fd',
    fontWeight: '600',
  },
});
