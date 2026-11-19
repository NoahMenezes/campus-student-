import { DarkTheme, DefaultTheme, ThemeProvider, useRouter, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { useState } from 'react';

import { VideoSplashOverlay } from '@/components/video-splash';
import AppTabs from '@/components/app-tabs';
import LoginScreen from './login';
import SignupScreen from './signup';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [showIntro] = useState(true);
  const [authed, setAuthed] = useState(false);
  const colorScheme = useColorScheme();

  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  if (pathname === '/login') {
    return (
      <ThemeProvider value={theme}>
        <LoginScreen onLogin={() => setAuthed(true)} />
      </ThemeProvider>
    );
  }

  if (pathname === '/signup') {
    return (
      <ThemeProvider value={theme}>
        <SignupScreen onSignup={() => {
          setAuthed(true);
          router.replace('/');
        }} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={theme}>
      {showIntro ? (
        <VideoSplashOverlay />
      ) : authed ? (
        <AppTabs />
      ) : (
        <LoginScreen onLogin={() => setAuthed(true)} />
      )}
    </ThemeProvider>
  );
}
