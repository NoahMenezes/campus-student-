import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AttendanceWarningCard,
  BottomNavigation,
  DashboardHeader,
  DashboardTab,
  HistoryView,
  OverallAttendanceCard,
  ProfileView,
  QRView,
  SubjectAttendanceCard,
} from '@/components/dashboard';
import {
  AttendanceData,
  fetchAttendanceData,
} from '@/services/attendance';
import {
  getUser,
  isAuthenticated,
  logout,
  type AuthUser,
} from '@/services/auth';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [currentTab, setCurrentTab] = useState<DashboardTab>('home');
  const [refreshing, setRefreshing] = useState(false);
  const [hasUnreadNotification, setHasUnreadNotification] = useState(true);

  // Authentication & session check on load
  useEffect(() => {
    let isMounted = true;

    async function loadSessionAndData() {
      const authed = await isAuthenticated();
      if (!authed) {
        router.replace('/login');
        return;
      }

      const currentUser = await getUser();
      if (isMounted) {
        setUser(currentUser);
      }

      const data = await fetchAttendanceData(currentUser);
      if (isMounted) {
        setAttendance(data);
      }
    }

    loadSessionAndData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    const data = await fetchAttendanceData(user);
    setAttendance(data);
    setRefreshing(false);
  };

  const handleNotificationPress = () => {
    setHasUnreadNotification(false);
    const message = attendance?.warning
      ? `Attendance Alert:\n${attendance.warning.message}\n\nSemester 5 Mid-term evaluation starts in 2 weeks.`
      : 'You have no urgent attendance alerts. Keep up the good attendance!';

    if (Platform.OS === 'web') {
      window.alert(`Campus Notifications\n\n${message}`);
    } else {
      Alert.alert('Campus Notifications', message, [{ text: 'OK' }]);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Vibrant Indigo -> Royal Blue -> Cyan/Blue Vertical Gradient */}
      <LinearGradient
        colors={['#4338CA', '#2563EB', '#0284C7']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header Container */}
      <View style={[styles.headerWrapper, { paddingTop: Math.max(insets.top, 16) }]}>
        <DashboardHeader
          userName={user?.name || 'Noah'}
          onNotificationPress={handleNotificationPress}
          hasUnreadNotifications={hasUnreadNotification}
        />
      </View>

      {/* Main Scroll Content Area */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + 100, // Space for floating bottom navigation
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#ffffff"
            colors={['#ffffff']}
          />
        }
      >
        {currentTab === 'home' && (
          <View style={styles.dashboardBody}>
            {/* 1. Overall Attendance Glass Card */}
            <Animated.View entering={FadeInDown.duration(600).delay(100)}>
              <OverallAttendanceCard
                overallPercentage={attendance?.overallPercentage ?? 82}
                semester={attendance?.semester ?? 'Semester 5'}
                attendedClasses={attendance?.attendedClasses ?? 46}
                totalClasses={attendance?.totalClasses ?? 56}
              />
            </Animated.View>

            {/* 2. Attendance Warning Glass Alert */}
            {attendance?.warning && (
              <Animated.View entering={FadeInUp.duration(600).delay(200)}>
                <AttendanceWarningCard message={attendance.warning.message} />
              </Animated.View>
            )}

            {/* 3. Individual Subject Attendance Glass Cards */}
            <View style={styles.subjectsSection}>
              {(attendance?.subjects || []).map((subject, index) => (
                <Animated.View
                  key={subject.id}
                  entering={FadeInUp.duration(600).delay(300 + index * 100)}
                >
                  <SubjectAttendanceCard
                    name={subject.name}
                    percentage={subject.percentage}
                    progressColor={subject.progressColor}
                  />
                </Animated.View>
              ))}
            </View>
          </View>
        )}

        {currentTab === 'qr' && (
          <Animated.View entering={FadeInUp.duration(500)}>
            <QRView
              userName={user?.name || 'Student'}
              semester={attendance?.semester || 'Semester 5'}
            />
          </Animated.View>
        )}

        {currentTab === 'history' && (
          <Animated.View entering={FadeInUp.duration(500)}>
            <HistoryView />
          </Animated.View>
        )}

        {currentTab === 'profile' && (
          <Animated.View entering={FadeInUp.duration(500)}>
            <ProfileView
              user={user}
              semester={attendance?.semester || 'Semester 5'}
              onSignOut={handleSignOut}
            />
          </Animated.View>
        )}
      </ScrollView>

      {/* Floating Glass Bottom Navigation Pill */}
      <BottomNavigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1E40AF',
  },
  headerWrapper: {
    paddingHorizontal: 20,
    zIndex: 10,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  dashboardBody: {
    gap: 16,
  },
  subjectsSection: {
    gap: 14,
    marginTop: 2,
  },
});
