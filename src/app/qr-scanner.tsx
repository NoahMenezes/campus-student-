import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/bottom-tab-bar';

const BG_MAIN = '#090A0C';

type ScanState = 'idle' | 'processing' | 'success' | 'error';

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanMessage, setScanMessage] = useState<string>('');

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanState !== 'idle') return;
    setScanState('processing');

    // Simulate verification
    setTimeout(() => {
      if (data && data.length > 0) {
        setScanState('success');
        setScanMessage(`Code verified: ${data}`);
      } else {
        setScanState('error');
        setScanMessage('Invalid QR code format.');
      }
    }, 1200);
  };

  const handleResetScan = () => {
    setScanState('idle');
    setScanMessage('');
  };

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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>QR Attendance Scanner</Text>
            <Text style={styles.headerSubtitle}>
              Scan the QR code displayed in your lecture hall
            </Text>
          </View>

          {/* Camera Permission check */}
          {!permission?.granted ? (
            <View style={styles.cardContainer}>
              <Text style={styles.permissionTitle}>Camera Access Required</Text>
              <Text style={styles.permissionDesc}>
                We need access to your camera to scan lecture attendance QR codes.
              </Text>
              <Pressable
                onPress={requestPermission}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>GRANT CAMERA PERMISSION</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.scannerWrapper}>
              {Platform.OS === 'web' ? (
                <View style={styles.webFallback}>
                  <Text style={styles.webFallbackTitle}>Camera Scanner Active</Text>
                  <Text style={styles.webFallbackDesc}>
                    Live barcode scanner is enabled for device testing.
                  </Text>
                  <Pressable
                    onPress={() => handleBarCodeScanned({ data: 'SE5_B_DBMS_' + Date.now() })}
                    style={styles.primaryBtn}
                  >
                    <Text style={styles.primaryBtnText}>TEST SCAN (SAMPLE CODE)</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.cameraBox}>
                  <CameraView
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    barcodeScannerSettings={{
                      barcodeTypes: ['qr'],
                    }}
                    onBarcodeScanned={scanState === 'idle' ? handleBarCodeScanned : undefined}
                  />
                  <View style={styles.reticleFrame} />
                </View>
              )}

              {/* Status Banner */}
              {scanState === 'processing' && (
                <Animated.View entering={FadeInDown} style={styles.statusBox}>
                  <ActivityIndicator size="small" color="#387BFF" />
                  <Text style={styles.statusText}>Verifying session token...</Text>
                </Animated.View>
              )}

              {scanState === 'success' && (
                <Animated.View entering={FadeInDown} style={styles.successBox}>
                  <Text style={styles.successTitle}>✓ Attendance Verified</Text>
                  <Text style={styles.statusDesc}>{scanMessage}</Text>
                  <Pressable onPress={handleResetScan} style={styles.resetBtn}>
                    <Text style={styles.resetBtnText}>Scan Another Code</Text>
                  </Pressable>
                </Animated.View>
              )}

              {scanState === 'error' && (
                <Animated.View entering={FadeInDown} style={styles.errorBox}>
                  <Text style={styles.errorTitle}>Verification Failed</Text>
                  <Text style={styles.statusDesc}>{scanMessage}</Text>
                  <Pressable onPress={handleResetScan} style={styles.resetBtn}>
                    <Text style={styles.resetBtnText}>Try Again</Text>
                  </Pressable>
                </Animated.View>
              )}
            </View>
          )}
        </ScrollView>

        <BottomTabBar />
      </SafeAreaView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
    gap: 16,
  },
  headerContainer: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F5F5F7',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.60)',
  },
  cardContainer: {
    backgroundColor: 'rgba(16,20,26,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 0,
    padding: 24,
    gap: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5F5F7',
  },
  permissionDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.60)',
    textAlign: 'center',
    lineHeight: 18,
  },
  scannerWrapper: {
    gap: 16,
  },
  cameraBox: {
    height: 340,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 0,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticleFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#0052FF',
    borderRadius: 0,
  },
  webFallback: {
    backgroundColor: 'rgba(16,20,26,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 0,
    padding: 24,
    gap: 12,
    alignItems: 'center',
  },
  webFallbackTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5F5F7',
  },
  webFallbackDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.60)',
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: '#0052FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 0,
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16,20,26,0.90)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 0,
    padding: 14,
  },
  statusText: {
    fontSize: 13,
    color: '#F5F5F7',
    fontWeight: '600',
  },
  successBox: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 0,
    padding: 16,
    gap: 8,
  },
  successTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 0,
    padding: 16,
    gap: 8,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  statusDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.70)',
  },
  resetBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  resetBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
