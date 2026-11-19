import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { VideoSplashOverlay } from '@/components/video-splash';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <VideoSplashOverlay />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#02030a' },
          animation: 'fade',
        }}
      >
        {/* index redirects to /login */}
        <Stack.Screen name="index" options={{ gestureEnabled: false }} />
        {/* Auth screens */}
        <Stack.Screen name="login" options={{ gestureEnabled: false }} />
        <Stack.Screen name="signup" options={{ gestureEnabled: false }} />
        {/* Main app screens (post-auth) */}
        <Stack.Screen name="home" />
        <Stack.Screen name="explore" />
      </Stack>
    </ThemeProvider>
  );
}
