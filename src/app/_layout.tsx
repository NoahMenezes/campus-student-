import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { useColorScheme as useAppColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useAppColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
        {/* Main app screens (post-auth) */}
        <Stack.Screen name="home" options={{ gestureEnabled: false }} />
        <Stack.Screen name="qr-scanner" options={{ gestureEnabled: false }} />
        <Stack.Screen name="attendance-history" options={{ gestureEnabled: false }} />
        <Stack.Screen name="profile" options={{ gestureEnabled: false }} />
        <Stack.Screen name="explore" options={{ gestureEnabled: false }} />
      </Stack>
    </ThemeProvider>
  );
}
