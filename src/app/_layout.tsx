import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { useColorScheme as useAppColorScheme } from '@/hooks/use-color-scheme';
import { VideoSplashOverlay } from '@/components/video-splash';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useAppColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <VideoSplashOverlay />
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
        <Stack.Screen name="explore" options={{ gestureEnabled: false }} />
      </Stack>
    </ThemeProvider>
  );
}
