import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, StatusBar, StyleSheet } from 'react-native';

import { isAuthenticated } from '@/services/auth';

const FADE_MS = 400;
const DURATION_FALLBACK_MS = 10000;

let Video: any = null;
let ResizeMode: any = null;
let expoAvAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const expoAv = require('expo-av');
  Video = expoAv.Video;
  ResizeMode = expoAv.ResizeMode;
  expoAvAvailable = true;
} catch {
  expoAvAvailable = false;
}

export function VideoSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const [fadeAnim] = useState(() => new Animated.Value(1));
  const hasFinishedRef = useRef(false);
  const videoRef = useRef<any>(null);

  const handleFinish = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: FADE_MS,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      SplashScreen.hideAsync().catch(() => {});
      setVisible(false);
      isAuthenticated().then((authed) => {
        if (authed) {
          router.replace('/home');
        } else {
          router.replace('/login');
        }
      });
    });
  }, [fadeAnim]);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    const safetyTimer = setTimeout(handleFinish, DURATION_FALLBACK_MS);
    return () => clearTimeout(safetyTimer);
  }, [handleFinish]);

  useEffect(() => {
    if (!expoAvAvailable) {
      handleFinish();
    }
  }, [handleFinish]);

  if (!visible || !expoAvAvailable) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar hidden />
      <Video
        ref={videoRef}
        source={require('@/assets/konnakol_first_appearance.mp4')}
        style={styles.video}
        shouldPlay
        isLooping={false}
        resizeMode={ResizeMode.COVER}
        useNativeControls={false}
        onPlaybackStatusUpdate={() => {}}
        onError={() => handleFinish()}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 999999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
});
