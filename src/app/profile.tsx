import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import { GlassCard, GlassCardContent } from '@/components/glass/glass-card';
import { getUser, logout } from '@/services/auth';

const BG_MAIN = '#090A0C';
const DUSTY_RED = '#B55A5A';

export default function ProfileScreen() {
  const [user, setUser] = useState<{ id: string; email: string; name: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getUser();
      if (mounted) {
        setUser(u);
        setLoading(false);
      }
    })();
    return () => {
      // noop
    };
  }, []);

  const handleLogout = async () => {
    await Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Konnakol?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out', style: 'destructive', onPress: async () => {
            await logout();
            router.replace('/login');
          }
        },
      ]
    );
  };

  if (loading || !user) {
    return (
      <View style={styles.root}>
        <Image
          source={require('@/assets/konnakol_background.png')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition="center"
        />
        <LinearGradient
          colors={['rgba(9,10,12,0.55)', 'rgba(16,18,22,0.85)', 'rgba(9,10,12,0.96)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Image
        source={require('@/assets/konnakol_background.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="center"
      />
      <LinearGradient
        colors={['rgba(9,10,12,0.45)', 'rgba(16,18,22,0.75)', 'rgba(9,10,12,0.94)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.profileHeader}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatar} />
            </View>
            <Text style={styles.displayName}>{user?.name || 'Student'}</Text>
            <Text style={styles.displayEmail}>{user?.email || ''}</Text>
            <Text style={styles.displayRole}>
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Student'} &bull; ID: {user?.id || '—'}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.settingsContainer}>
            <GlassCard intensity="strong" borderRadius={0} style={styles.settingsCard}>
              <GlassCardContent style={styles.settingsContent}>
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsLabel}>Edit Profile</Text>
                  <Text style={styles.settingsValue}>Update your details</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsLabel}>Notifications</Text>
                  <Text style={styles.settingsValue}>Manage alerts</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsLabel}>Help &amp; Support</Text>
                  <Text style={styles.settingsValue}>Contact campus support</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsLabel}>About Konnakol</Text>
                  <Text style={styles.settingsValue}>Campus Attendance Portal</Text>
                </View>
              </GlassCardContent>
            </GlassCard>

            <GlassCard intensity="strong" borderRadius={0} style={styles.actionCard}>
              <GlassCardContent style={styles.actionContent}>
                <Text style={styles.sectionTitle}>Account Actions</Text>
                <TouchableOpacity
                  onPress={handleLogout}
                  style={styles.logoutRow}
                >
                  <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
              </GlassCardContent>
            </GlassCard>
          </Animated.View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_MAIN,
  },
  safeArea: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navWrapper: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    zIndex: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 0,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F0F0F0',
    letterSpacing: -0.4,
  },
  displayEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.60)',
    marginTop: 4,
  },
  displayRole: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  settingsContainer: {
    flex: 1,
  },
  settingsCard: {
    borderRadius: 0,
  },
  settingsContent: {
    padding: 16,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.60)',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F0F0F0',
  },
  settingsValue: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.50)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginLeft: 0,
    marginRight: 0,
  },
  actionCard: {
    borderRadius: 0,
  },
  actionContent: {
    padding: 16,
    gap: 4,
  },
  logoutRow: {
    paddingVertical: 14,
    paddingHorizontal: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: DUSTY_RED,
  },
  bottomSpacer: {
    height: 20,
  },
});
