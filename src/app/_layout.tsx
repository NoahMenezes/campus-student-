import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';

import { useColorScheme as useAppColorScheme } from '@/hooks/use-color-scheme';
import { DemoInspectorSheet } from '@/components/demo-inspector-sheet';
import { VideoSplashOverlay } from '@/components/video-splash';
import { flushOfflineQueue } from '@/services/attendance-manager';
import {
  startAttendanceStream,
  stopAttendanceStream,
  subscribeLowAttendanceAlert,
} from '@/services/attendance-stream';
import {
  isAuthenticated,
  subscribeAuthSession,
  subscribeReconnectingToast,
} from '@/services/auth';
import { subscribeDemoToast } from '@/services/demo-mode';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useAppColorScheme();
  const [reconnectMsg, setReconnectMsg] = useState<string | null>(null);
  const [lowAlertMsg, setLowAlertMsg] = useState<string | null>(null);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let alertTimer: ReturnType<typeof setTimeout> | null = null;
    const showToast = (msg: string) => {
      setReconnectMsg(msg);
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setReconnectMsg(null), 4000);
    };
    const unsub = subscribeReconnectingToast(showToast);
    const unsubDemo = subscribeDemoToast(showToast);
    const unsubAlert = subscribeLowAttendanceAlert((alert) => {
      setLowAlertMsg(`Dropped below 75%: ${alert.message}`);
      if (alertTimer) clearTimeout(alertTimer);
      alertTimer = setTimeout(() => setLowAlertMsg(null), 6000);
    });

    const syncStreamAuth = () => {
      isAuthenticated()
        .then((ok) => {
          if (ok) startAttendanceStream();
          else stopAttendanceStream();
        })
        .catch(() => {});
    };
    syncStreamAuth();
    const unsubSession = subscribeAuthSession(syncStreamAuth);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        flushOfflineQueue().catch(() => {});
        syncStreamAuth();
      }
    });

    const onOnline = () => {
      flushOfflineQueue().catch(() => {});
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('online', onOnline);
    }

    return () => {
      unsub();
      unsubDemo();
      unsubAlert();
      unsubSession();
      stopAttendanceStream();
      sub.remove();
      if (hideTimer) clearTimeout(hideTimer);
      if (alertTimer) clearTimeout(alertTimer);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('online', onOnline);
      }
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <VideoSplashOverlay />
      {reconnectMsg ? (
        <View style={styles.toastBanner} pointerEvents="none">
          <Text style={styles.toastText}>{reconnectMsg}</Text>
        </View>
      ) : null}
      {lowAlertMsg ? (
        <View style={[styles.toastBanner, styles.alertToastBanner]} pointerEvents="none">
          <Text style={styles.alertToastText}>{lowAlertMsg}</Text>
        </View>
      ) : null}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#090A0C' },
          animation: 'fade',
        }}
      >
        {/* Auth screens */}
        <Stack.Screen name="index" options={{ gestureEnabled: false }} />
        <Stack.Screen name="login" options={{ gestureEnabled: false }} />
        <Stack.Screen name="signup" options={{ gestureEnabled: false }} />

        {/* Primary Attendance Screens */}
        <Stack.Screen name="home" options={{ gestureEnabled: false }} />
        <Stack.Screen name="today" options={{ gestureEnabled: false }} />
        <Stack.Screen name="yesterday" options={{ gestureEnabled: false }} />
        <Stack.Screen name="subjects" options={{ gestureEnabled: false }} />
        <Stack.Screen name="monthly-reports" options={{ gestureEnabled: false }} />
        <Stack.Screen name="timetable" options={{ gestureEnabled: false }} />
        <Stack.Screen name="notifications" options={{ gestureEnabled: false }} />

        {/* Secondary / Profile / Tool screens */}
        <Stack.Screen name="calendar" options={{ gestureEnabled: false }} />
        <Stack.Screen name="qr-scanner" options={{ gestureEnabled: false }} />
        <Stack.Screen name="attendance-history" options={{ gestureEnabled: false }} />
        <Stack.Screen name="profile" options={{ gestureEnabled: false }} />
        <Stack.Screen name="demo-center" options={{ gestureEnabled: false }} />
        <Stack.Screen name="explore" options={{ gestureEnabled: false }} />
      </Stack>
      <DemoInspectorSheet />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  toastBanner: {
    position: 'absolute',
    top: 48,
    left: 20,
    right: 20,
    zIndex: 99999,
    backgroundColor: 'rgba(245, 158, 11, 0.95)',
    borderWidth: 1,
    borderColor: '#FBBF24',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toastText: {
    color: '#090A0C',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  alertToastBanner: {
    top: 94,
    backgroundColor: 'rgba(220, 38, 38, 0.96)',
    borderColor: '#FCA5A5',
  },
  alertToastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
});
