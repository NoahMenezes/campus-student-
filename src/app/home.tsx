import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  GlassButton,
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
  GlassView,
} from '@/components/glass';
import { getUser, logout, type AuthUser } from '@/services/auth';

export default function HomeScreen() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    getUser().then((user) => {
      if (user) setCurrentUser(user);
    });
  }, []);

  const handleSignOut = async () => {
    await logout();
    router.replace('/login');
  };

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
          'rgba(2, 4, 10, 0.60)',
          'rgba(4, 7, 14, 0.78)',
          'rgba(2, 4, 10, 0.94)',
        ]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        {/* Navigation Bar */}
        <Animated.View entering={FadeInDown.duration(500).delay(50)} style={styles.navbar}>
          <GlassView intensity="strong" borderRadius={18} style={styles.navbarInner}>
            <Text style={styles.navBrandText}>Konnakol</Text>
            <View style={styles.navActions}>
              <GlassButton
                variant="outline"
                size="xs"
                onPress={handleSignOut}
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
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(600).delay(150)} style={styles.hero}>
            <Text style={styles.greetingTitle}>
              {currentUser ? `Welcome, ${currentUser.name}` : 'Student Workspace'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {currentUser?.email || 'Campus academic portal'}
            </Text>
          </Animated.View>

          {/* Academic Modules Grid (No Emojis) */}
          <Animated.View entering={FadeInUp.duration(600).delay(250)} style={styles.grid}>
            {[
              { code: 'SCH', title: 'Schedule', detail: 'View classes & labs' },
              { code: 'CRS', title: 'Courses', detail: 'Syllabus & coursework' },
              { code: 'NTC', title: 'Notices', detail: 'Official department circulars' },
              { code: 'RES', title: 'Resources', detail: 'Library & campus tools' },
            ].map((item) => (
              <Pressable key={item.title} style={styles.gridItem}>
                <GlassCard intensity="default" borderRadius={18} style={styles.gridCard}>
                  <GlassCardContent>
                    <View style={styles.moduleTag}>
                      <Text style={styles.moduleTagText}>{item.code}</Text>
                    </View>
                    <Text style={styles.gridTitle}>{item.title}</Text>
                    <Text style={styles.gridDetail}>{item.detail}</Text>
                  </GlassCardContent>
                </GlassCard>
              </Pressable>
            ))}
          </Animated.View>

          {/* Announcements Card */}
          <Animated.View entering={FadeInUp.duration(600).delay(350)}>
            <GlassCard intensity="default" borderRadius={20} style={styles.noticeCard}>
              <GlassCardHeader>
                <GlassCardTitle>Academic Term Information</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <Text style={styles.noticeBody}>
                  Course registration and schedule records are synchronized with the campus server.
                  For queries or credential changes, reach out to your department coordinator.
                </Text>
              </GlassCardContent>
            </GlassCard>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020408' },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    gap: 18,
  },

  /* Navbar */
  navbar: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 6, zIndex: 10 },
  navbarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(8, 12, 20, 0.65)',
  },
  navBrandText: { fontSize: 16, fontWeight: '700', color: '#ffffff', letterSpacing: -0.3 },
  navActions: { flexDirection: 'row', alignItems: 'center' },

  /* Hero */
  hero: { paddingTop: 16, paddingBottom: 8 },
  greetingTitle: { fontSize: 24, fontWeight: '700', color: '#ffffff', letterSpacing: -0.4 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255, 255, 255, 0.50)', marginTop: 4 },

  /* Grid */
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '48%' },
  gridCard: {
    backgroundColor: 'rgba(8, 12, 20, 0.70)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  moduleTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  moduleTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 0.5,
  },
  gridTitle: { fontSize: 15, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  gridDetail: { fontSize: 12, color: 'rgba(255, 255, 255, 0.45)', lineHeight: 16 },

  /* Notice */
  noticeCard: {
    backgroundColor: 'rgba(8, 12, 20, 0.70)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  noticeBody: { fontSize: 13, color: 'rgba(255, 255, 255, 0.60)', lineHeight: 20 },
});
