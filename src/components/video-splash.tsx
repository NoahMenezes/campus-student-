import { Video, AVPlaybackStatus, ResizeMode } from 'expo-av';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

const SHOW_MS = 8000;
const BG = '#000000';

export function VideoSplashOverlay() {
  const router = useRouter();
  const [finished, setFinished] = useState(false);

  const finish = useCallback(() => {
    if (finished) return;
    setFinished(true);
    SplashScreen.hideAsync().finally(() => {
      router.replace('/login');
    });
  }, [finished, router]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish) {
      finish();
    }
  };

  useEffect(() => {
    const timer = setTimeout(finish, SHOW_MS);
    return () => clearTimeout(timer);
  }, [finish]);

  return (
    <View style={styles.container}>
      <Video
        source={require('@/assets/konnakol_first_appearance.mp4')}
        style={styles.video}
        shouldPlay
        isLooping={false}
        resizeMode={ResizeMode.CONTAIN}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: BG,
    zIndex: 2000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
