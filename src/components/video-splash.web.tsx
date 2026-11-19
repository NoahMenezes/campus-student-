import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const FADE_MS = 400;
const DURATION_FALLBACK_MS = 8500;

export function VideoSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasFinishedRef = useRef(false);

  const handleFinish = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setFading(true);
    setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
      setVisible(false);
    }, FADE_MS);
  }, []);

  useEffect(() => {
    // Hide native splash screen once our video overlay is mounted
    SplashScreen.hideAsync().catch(() => {});

    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Autoplay failed or blocked:', err);
          handleFinish();
        });
      }
    }

    const timer = setTimeout(() => {
      handleFinish();
    }, DURATION_FALLBACK_MS);

    return () => clearTimeout(timer);
  }, [handleFinish]);

  const handleContainerClick = () => {
    if (videoRef.current && videoRef.current.muted) {
      videoRef.current.muted = false;
    }
  };

  if (!visible) return null;

  return (
    <div
      onClick={handleContainerClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <video
        ref={videoRef}
        src="/konnakol_first_appearance.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={handleFinish}
        onError={() => handleFinish()}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: '#000000',
          display: 'block',
        }}
      >
        <source src="/konnakol_first_appearance.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
