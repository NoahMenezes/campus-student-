import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  GlassButton,
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
  GlassView,
} from '@/components/glass';

export default function HomeScreen() {
  return (
    <View style={styles.root}>
      {/* Dark forest background */}
      <Image
        source={require('@/assets/konnakol_background.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="center"
        priority="high"
      />
      {/* Deep cinematic overlay */}
      <LinearGradient
        colors={[
          'rgba(2, 4, 10, 0.50)',
          'rgba(5, 8, 15, 0.70)',
          'rgba(3, 5, 12, 0.88)',
          'rgba(2, 3, 8, 0.95)',
        ]}
        locations={[0, 0.3, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        {/* Top navbar */}
        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.navbar}>
          <GlassView intensity="strong" borderRadius={22} style={styles.navbarInner}>
            <View style={styles.navBrand}>
              <View style={styles.navDot} />
              <Text style={styles.navBrandText}>Konnakol</Text>
            </View>
            <View style={styles.navActions}>
              <GlassButton variant="ghost" size="xs" onPress={() => router.push('/explore')}>
                Explore
              </GlassButton>
              <GlassButton
                variant="outline"
                size="xs"
                onPress={() => router.replace('/login')}
              >
                Sign out
              </GlassButton>
            </View>
          </GlassView>
        </Animated.View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <Animated.View entering={FadeInDown.duration(700).delay(250)} style={styles.hero}>
            <View style={styles.heroLogoMark}>
              <View style={styles.heroGlow} />
              <Text style={styles.heroLetter}>K</Text>
            </View>
            <Text style={styles.heroTitle}>Konnakol</Text>
            <Text style={styles.heroSubtitle}>Your campus, connected.</Text>
          </Animated.View>

          {/* Quick actions */}
          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.sectionLabel}>
            <View style={styles.labelPill}>
              <View style={styles.labelDot} />
              <Text style={styles.labelText}>QUICK ACCESS</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(500)} style={styles.grid}>
            {[
              { icon: '📅', label: 'Schedule', desc: 'View timetable' },
              { icon: '📢', label: 'Notices', desc: 'Campus alerts' },
              { icon: '📚', label: 'Courses', desc: 'Your subjects' },
              { icon: '👥', label: 'Community', desc: 'Student hub' },
            ].map((item) => (
              <Pressable key={item.label} style={styles.gridItem}>
                <GlassCard intensity="default" borderRadius={20} style={styles.gridCard}>
                  <GlassCardContent>
                    <Text style={styles.gridIcon}>{item.icon}</Text>
                    <Text style={styles.gridLabel}>{item.label}</Text>
                    <Text style={styles.gridDesc}>{item.desc}</Text>
                  </GlassCardContent>
                </GlassCard>
              </Pressable>
            ))}
          </Animated.View>

          {/* Announcements */}
          <Animated.View entering={FadeInUp.duration(600).delay(650)} style={styles.sectionLabel}>
            <View style={styles.labelPill}>
              <View style={[styles.labelDot, { backgroundColor: '#a78bfa' }]} />
              <Text style={styles.labelText}>ANNOUNCEMENTS</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(750)}>
            <GlassCard intensity="default" borderRadius={20} style={styles.announcementCard}>
              <GlassCardHeader>
                <GlassCardTitle>Welcome to Konnakol Campus!</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <Text style={styles.announcementText}>
                  Your academic portal is now live. Check your schedule, track assignments,
                  and stay connected with your campus community.
                </Text>
              </GlassCardContent>
            </GlassCard>
          </Animated.View>

          {/* Footer */}
          <Animated.View entering={FadeIn.duration(600).delay(900)} style={styles.footer}>
            <Text style={styles.footerText}>Konnakol Campus Student · v1.0</Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#02030a' },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 40,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },

  /* Navbar */
  navbar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, zIndex: 10 },
  navbarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38bdf8',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  navBrandText: { fontSize: 15, fontWeight: '700', color: '#ffffff', letterSpacing: 0.2 },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  /* Hero */
  hero: { alignItems: 'center', paddingTop: 20, paddingBottom: 8, gap: 8 },
  heroLogoMark: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderTopColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  heroGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(56,189,248,0.15)',
  },
  heroLetter: { fontSize: 28, fontWeight: '800', color: '#ffffff', zIndex: 1 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#ffffff', letterSpacing: -0.6 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.50)', letterSpacing: 0.3 },

  /* Section label */
  sectionLabel: { alignItems: 'center' },
  labelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  labelDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#38bdf8' },
  labelText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.75)', letterSpacing: 1.4 },

  /* Grid */
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '47.5%' },
  gridCard: { backgroundColor: 'rgba(10,15,30,0.55)' },
  gridIcon: { fontSize: 26, marginBottom: 6 },
  gridLabel: { fontSize: 14, fontWeight: '700', color: '#ffffff', marginBottom: 2 },
  gridDesc: { fontSize: 11, color: 'rgba(255,255,255,0.45)' },

  /* Announcement */
  announcementCard: { backgroundColor: 'rgba(10,15,30,0.55)' },
  announcementText: { fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 20 },

  /* Footer */
  footer: { alignItems: 'center', paddingTop: 8 },
  footerText: { fontSize: 11, color: 'rgba(255,255,255,0.25)' },
});
