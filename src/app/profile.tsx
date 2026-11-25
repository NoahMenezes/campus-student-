import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import {
  clearAllAttendanceRecords,
  getOverallAttendanceSummary,
  getStudentBatch,
  setStudentBatch,
} from '@/services/attendance-manager';
import { getUser, logout } from '@/services/auth';
import { LabBatch, OverallAttendanceSummary } from '@/types/attendance';

const BG_MAIN = '#090A0C';

export default function ProfileScreen() {
  const [user, setUser] = useState<{ id: string; email: string; name: string; role?: string } | null>(null);
  const [batch, setBatch] = useState<LabBatch>('C');
  const [summary, setSummary] = useState<OverallAttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const [u, b, s] = await Promise.all([
        getUser(),
        getStudentBatch(),
        getOverallAttendanceSummary(),
      ]);
      setUser(u);
      setBatch(b);
      setSummary(s);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleToggleBatch = async (newBatch: LabBatch) => {
    setBatch(newBatch);
    await setStudentBatch(newBatch);
    await loadProfile();
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset Attendance Data',
      'This will delete all marked attendance sessions and revert to an empty state. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearAllAttendanceRecords();
            const s = await getOverallAttendanceSummary();
            setSummary(s);
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login' as any);
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <Image
          source={require('@/assets/konnakol_background.png')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition="center"
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
        colors={['rgba(9,10,12,0.45)', 'rgba(16,18,22,0.80)', 'rgba(9,10,12,0.96)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerBlock}>
            <Text style={styles.subTitle}>STUDENT PROFILE</Text>
            <Text style={styles.title}>Account &amp; Settings</Text>
          </View>

          {/* Profile Card */}
          <Animated.View entering={FadeInUp.duration(300)} style={styles.card}>
            <View style={styles.avatarRow}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarLetter}>
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'NM'}
                </Text>
              </View>
              <View style={styles.userMain}>
                <Text style={styles.userName}>{user?.name || 'Noah Menezes'}</Text>
                <Text style={styles.userEmail}>{user?.email || 'nnm1.s24@gec.ac.in'}</Text>
              </View>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>INSTITUTION</Text>
                <Text style={styles.infoVal}>Goa College of Engineering</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>DEPARTMENT</Text>
                <Text style={styles.infoVal}>Computer Engineering</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>CLASS &amp; SECTION</Text>
                <Text style={styles.infoVal}>SE Sem 5 &bull; Section B</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>TIMEZONE</Text>
                <Text style={styles.infoVal}>Asia/Kolkata (IST)</Text>
              </View>
            </View>
          </Animated.View>

          {/* Batch Selector Card */}
          <Animated.View entering={FadeInUp.delay(50).duration(300)} style={styles.card}>
            <Text style={styles.cardHeaderTitle}>Laboratory Batch</Text>
            <Text style={styles.cardHeaderSub}>
              Configures your weekly laboratory schedule according to Section B timetable.
            </Text>

            <View style={styles.batchSelectorRow}>
              <Pressable
                onPress={() => handleToggleBatch('C')}
                style={[styles.batchCard, batch === 'C' && styles.batchCardActive]}
              >
                <Text style={[styles.batchCardTitle, batch === 'C' && styles.batchCardTitleActive]}>
                  Batch C (Default)
                </Text>
                <Text style={styles.batchCardDesc}>
                  DAA Lab (Mon), AI Lab (Tue), SC Lab (Wed AM), DAA Lab (Wed PM), DBMS Lab (Thu), DCCN Lab (Fri)
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleToggleBatch('D')}
                style={[styles.batchCard, batch === 'D' && styles.batchCardActive]}
              >
                <Text style={[styles.batchCardTitle, batch === 'D' && styles.batchCardTitleActive]}>
                  Batch D
                </Text>
                <Text style={styles.batchCardDesc}>
                  SC Lab (Mon), DCCN Lab (Tue), DAA Lab (Wed AM), DBMS Lab (Wed PM), DAA Lab (Thu), AI Lab (Fri)
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* Attendance Overview Card */}
          <Animated.View entering={FadeInUp.delay(100).duration(300)} style={styles.card}>
            <Text style={styles.cardHeaderTitle}>Attendance Summary</Text>
            <View style={styles.summaryRow}>
              <View style={styles.sumBox}>
                <Text style={styles.sumVal}>{summary && summary.hasRecords ? `${summary.percentage}%` : '0%'}</Text>
                <Text style={styles.sumLbl}>Overall</Text>
              </View>
              <View style={styles.sumBox}>
                <Text style={styles.sumVal}>{summary?.attendedClasses ?? 0}</Text>
                <Text style={styles.sumLbl}>Attended</Text>
              </View>
              <View style={styles.sumBox}>
                <Text style={styles.sumVal}>{summary?.absentClasses ?? 0}</Text>
                <Text style={styles.sumLbl}>Absent</Text>
              </View>
              <View style={styles.sumBox}>
                <Text style={styles.sumVal}>{summary?.totalClasses ?? 0}</Text>
                <Text style={styles.sumLbl}>Total</Text>
              </View>
            </View>

            <Pressable onPress={handleResetData} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>Clear &amp; Reset Attendance Records</Text>
            </Pressable>
          </Animated.View>

          {/* Admin-only Hidden Console Link */}
          {user?.role === 'admin' ? (
            <Animated.View entering={FadeInDown.delay(130).duration(300)}>
              <Pressable
                onPress={() => router.push('/demo-center' as any)}
                style={[styles.resetBtn, { borderColor: '#3B82F6', backgroundColor: 'rgba(0, 82, 255, 0.16)', alignSelf: 'stretch', alignItems: 'center', paddingVertical: 12 }]}
              >
                <Text style={[styles.resetBtnText, { color: '#93C5FD', fontSize: 13 }]}>
                  OPEN DEMO CENTER (ADMIN)
                </Text>
              </Pressable>
            </Animated.View>
          ) : null}

          {/* Logout Button */}
          <Animated.View entering={FadeInDown.delay(150).duration(300)}>
            <Pressable onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutBtnText}>LOGOUT</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>

        <BottomTabBar />
      </SafeAreaView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
    gap: 16,
  },
  headerBlock: {
    gap: 2,
  },
  subTitle: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F5F5F7',
    letterSpacing: -0.4,
  },
  card: {
    backgroundColor: 'rgba(16,20,26,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 0,
    padding: 16,
    gap: 14,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarBox: {
    width: 48,
    height: 48,
    backgroundColor: '#0052FF',
    borderWidth: 1,
    borderColor: '#387BFF',
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userMain: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5F5F7',
  },
  userEmail: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  infoGrid: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 12,
  },
  infoItem: {
    gap: 2,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  infoVal: {
    fontSize: 13,
    color: '#E5E7EB',
    fontWeight: '600',
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F5F5F7',
  },
  cardHeaderSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.60)',
    lineHeight: 16,
  },
  batchSelectorRow: {
    gap: 10,
  },
  batchCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 0,
    padding: 12,
    gap: 4,
  },
  batchCardActive: {
    borderColor: '#387BFF',
    backgroundColor: 'rgba(0,82,255,0.12)',
  },
  batchCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  batchCardTitleActive: {
    color: '#387BFF',
  },
  batchCardDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.60)',
    lineHeight: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 0,
    paddingVertical: 10,
  },
  sumBox: {
    flex: 1,
    alignItems: 'center',
  },
  sumVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5F5F7',
  },
  sumLbl: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  resetBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 0,
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    marginTop: 8,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
});
