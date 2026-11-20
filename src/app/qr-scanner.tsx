import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { GlassButton } from '@/components/glass/glass-button';
import { GlassCard, GlassCardContent } from '@/components/glass/glass-card';
import { BottomTabBar } from '@/components/bottom-tab-bar';

let BarCodeScanner: any = null;
let barcodeScannerAvailable = false;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const expoBarcodeScanner = require('expo-barcode-scanner');
try {
  BarCodeScanner = expoBarcodeScanner.BarCodeScanner;
  barcodeScannerAvailable = true;
} catch {
  barcodeScannerAvailable = false;
}

const BG_MAIN = '#090A0C';
const BRAND = '#A0A7B1';
const SAGE = '#8A9A7B';
const DUSTY_RED = '#B55A5A';

type ScanState = 'idle' | 'detected' | 'processing' | 'success' | 'error' | 'permission-denied';

export default function QRScannerScreen() {
  const [permission, setPermission] = useState<{ status: string } | null>(null);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanMessage, setScanMessage] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    if (!barcodeScannerAvailable) return;
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setPermission({ status });
      if (status === 'granted') {
        setScanState('idle');
        setScanMessage('Point camera at a QR code to scan attendance.');
      } else {
        setScanState('permission-denied');
        setScanMessage('Camera permission denied. Cannot scan QR codes.');
      }
    })();
  }, []);

  const handleBarCodeScanned = async (data: { data: string }) => {
    if (hasScannedRef.current || processing) return;
    const code = data.data;
    if (lastScanned === code) return;

    hasScannedRef.current = true;
    setLastScanned(code);
    setScanState('detected');
    setScanMessage('QR code detected. Verifying attendance...');

    try {
      setProcessing(true);
      await verifyAttendance(code);
      setScanState('success');
      setScanMessage('Attendance recorded successfully.');
    } catch (err: any) {
      setScanState('error');
      setScanMessage(err?.message || 'Failed to verify attendance.');
    } finally {
      setProcessing(false);
      setTimeout(() => {
        hasScannedRef.current = false;
        setScanState('idle');
        setScanMessage('Point camera at a QR code to scan attendance.');
        setLastScanned(null);
      }, 3000);
    }
  };

  const verifyAttendance = async (code: string) => {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
    try {
      const res = await fetch(`${baseUrl}/attendance/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Invalid or expired QR code.');
      }
      return await res.json();
    } catch {
      throw new Error('Unable to verify attendance. Server may be offline.');
    }
  };

  const requestCameraPermission = async () => {
    if (!barcodeScannerAvailable) return;
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    if (status === 'granted') {
      setScanState('idle');
      setScanMessage('Point camera at a QR code to scan attendance.');
    } else {
      setScanState('permission-denied');
      setScanMessage('Camera permission denied. Cannot scan QR codes.');
    }
  };

  if (!barcodeScannerAvailable) {
    return (
      <View style={{ flex: 1, backgroundColor: BG_MAIN, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#F5F5F7', fontSize: 16 }}>QR Scanner requires a development build (expo-barcode-scanner not available in Expo Go).</Text>
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
        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.navWrapper} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Scan Attendance</Text>
            <Text style={styles.headerSubtitle}>
              Scan a QR code to mark your class attendance
            </Text>
          </Animated.View>

          {permission?.status === 'undetermined' ? (
            <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.permissionCard}>
              <GlassCard intensity="strong" borderRadius={0} style={styles.cardStyle}>
                <GlassCardContent style={styles.cardContent}>
                  <Text style={styles.permissionTitle}>Camera Permission</Text>
                  <Text style={styles.permissionText}>
                    Konnakol needs access to your camera to scan attendance QR codes.
                  </Text>
                  <GlassButton
                    variant="default"
                    size="lg"
                    onPress={requestCameraPermission}
                    style={styles.permissionButton}
                  >
                    Grant Camera Access
                  </GlassButton>
                </GlassCardContent>
              </GlassCard>
            </Animated.View>
          ) : null}

          {permission?.status === 'denied' ? (
            <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.permissionCard}>
              <GlassCard intensity="strong" borderRadius={0} style={styles.cardStyle}>
                <GlassCardContent style={styles.cardContent}>
                  <Text style={styles.permissionTitle}>Permission Denied</Text>
                  <Text style={styles.permissionText}>
                    {scanMessage}
                  </Text>
                  <GlassButton
                    variant="outline"
                    size="lg"
                    onPress={requestCameraPermission}
                    style={styles.permissionButton}
                  >
                    Enable Camera
                  </GlassButton>
                </GlassCardContent>
              </GlassCard>
            </Animated.View>
          ) : null}

          {permission?.status === 'granted' && (
            <Animated.View entering={FadeInUp.duration(700).delay(300)} style={styles.cameraContainer}>
              <View style={styles.cameraWrapper}>
                <BarCodeScanner
                  style={StyleSheet.absoluteFill}
                  barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
                  onBarCodeScanned={handleBarCodeScanned}
                />
                <View style={styles.scanFrame} />
                <View style={styles.scanLine} />
              </View>

              <View style={styles.stateBanner}>
                <View style={styles.stateDot} />
                <Text style={styles.stateText}>{scanMessage}</Text>
              </View>

              {processing && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="large" color="#ffffff" />
                </View>
              )}

              {scanState === 'success' && (
                <GlassCard intensity="default" borderRadius={0} style={styles.successCard}>
                  <GlassCardContent style={styles.successContent}>
                    <Text style={styles.successTitle}>Attendance Recorded</Text>
                    <Text style={styles.successText}>
                      QR code verified and attendance marked.
                    </Text>
                    <GlassButton
                      variant="glass"
                      size="sm"
                      onPress={() => setScanState('idle')}
                      style={styles.dismissButton}
                    >
                      Scan Another
                    </GlassButton>
                  </GlassCardContent>
                </GlassCard>
              )}

              {scanState === 'error' && (
                <GlassCard intensity="default" borderRadius={0} style={styles.errorCard}>
                  <GlassCardContent style={styles.errorContent}>
                    <Text style={styles.errorTitle}>Verification Failed</Text>
                    <Text style={styles.errorText}>{scanMessage}</Text>
                    <GlassButton
                      variant="outline"
                      size="sm"
                      onPress={() => setScanState('idle')}
                      style={styles.dismissButton}
                    >
                      Try Again
                    </GlassButton>
                  </GlassCardContent>
                </GlassCard>
              )}
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
      <BottomTabBar />
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
  navWrapper: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    zIndex: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 16,
  },
  headerContainer: {
    gap: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F0F0F0',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.60)',
    textAlign: 'center',
  },
  permissionCard: {
    marginBottom: 20,
    borderRadius: 0,
  },
  cardStyle: {
    borderRadius: 0,
  },
  cardContent: {
    padding: 20,
    gap: 12,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F0F0F0',
  },
  permissionText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.70)',
    lineHeight: 18,
  },
  permissionButton: {
    width: '100%',
    backgroundColor: '#0052FF',
    borderColor: '#387BFF',
    borderRadius: 0,
  },
  cameraContainer: {
    flex: 1,
    marginBottom: 20,
  },
  cameraWrapper: {
    flex: 1,
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  scanFrame: {
    position: 'absolute',
    top: '15%',
    left: '10%',
    right: '10%',
    bottom: '45%',
    borderWidth: 2,
    borderColor: '#0052FF',
    borderRadius: 0,
  },
  scanLine: {
    position: 'absolute',
    top: '15%',
    left: '10%',
    right: '10%',
    height: 2,
    backgroundColor: '#0052FF',
    borderRadius: 0,
  },
  stateBanner: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(9,10,12,0.80)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderTopColor: 'rgba(255,255,255,0.20)',
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND,
  },
  stateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F0F0F0',
  },
  processingOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(9,10,12,0.50)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  successCard: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    borderRadius: 0,
    borderLeftWidth: 2,
    borderLeftColor: SAGE,
    zIndex: 5,
  },
  successContent: {
    padding: 16,
    gap: 8,
  },
  successTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F0F0F0',
  },
  successText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.70)',
  },
  dismissButton: {
    borderRadius: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  errorCard: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    borderRadius: 0,
    borderLeftWidth: 2,
    borderLeftColor: DUSTY_RED,
    zIndex: 5,
  },
  errorContent: {
    padding: 16,
    gap: 8,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F0F0F0',
  },
  errorText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.70)',
  },
});
