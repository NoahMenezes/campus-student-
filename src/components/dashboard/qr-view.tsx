import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassButton } from '@/components/glass';

export interface QRViewProps {
  userName: string;
  semester: string;
}

export function QRView({ userName, semester }: QRViewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.highlight} />

        <View style={styles.content}>
          <Text style={styles.title}>Campus QR Pass</Text>
          <Text style={styles.subtitle}>Present for lecture attendance scan</Text>

          {/* QR Code Graphic Frame */}
          <View style={styles.qrFrame}>
            <View style={styles.qrCornerTL} />
            <View style={styles.qrCornerTR} />
            <View style={styles.qrCornerBL} />
            <View style={styles.qrCornerBR} />
            <View style={styles.qrGraphic}>
              <Text style={styles.qrCodeIcon}>📱</Text>
              <Text style={styles.qrPlaceholderText}>SCAN FOR ATTENDANCE</Text>
              <Text style={styles.studentIdText}>STU-{semester.replace(' ', '')}-2026</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoName}>{userName || 'Student'}</Text>
            <Text style={styles.infoSemester}>{semester}</Text>
          </View>

          <GlassButton
            variant="default"
            size="default"
            style={styles.scanButton}
            onPress={() => alert('Camera scanner ready for faculty QR codes')}
          >
            Scan Faculty QR
          </GlassButton>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderTopColor: 'rgba(255, 255, 255, 0.50)',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.40)',
    zIndex: 2,
  },
  content: {
    padding: 24,
    alignItems: 'center',
    gap: 14,
    zIndex: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  qrFrame: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    position: 'relative',
    padding: 16,
  },
  qrCornerTL: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#1E40AF',
  },
  qrCornerTR: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#1E40AF',
  },
  qrCornerBL: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#1E40AF',
  },
  qrCornerBR: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#1E40AF',
  },
  qrGraphic: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  qrCodeIcon: {
    fontSize: 48,
  },
  qrPlaceholderText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E40AF',
    letterSpacing: 1,
  },
  studentIdText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  infoRow: {
    alignItems: 'center',
    gap: 2,
  },
  infoName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  infoSemester: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.80)',
  },
  scanButton: {
    width: '100%',
    marginTop: 6,
    backgroundColor: '#0052FF',
    borderRadius: 14,
  },
});
