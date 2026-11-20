import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassButton } from '@/components/glass';
import { type AuthUser } from '@/services/auth';

export interface ProfileViewProps {
  user: AuthUser | null;
  semester: string;
  onSignOut: () => void;
}

export function ProfileView({ user, semester, onSignOut }: ProfileViewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.highlight} />

        <View style={styles.content}>
          {/* Avatar Ring */}
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
            </Text>
          </View>

          <Text style={styles.userName}>{user?.name || 'Noah Menezes'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'student@gec.ac.in'}</Text>

          {/* Details Table */}
          <View style={styles.detailsList}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Program</Text>
              <Text style={styles.detailValue}>Computer Science &amp; Eng.</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Current Term</Text>
              <Text style={styles.detailValue}>{semester}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Student ID</Text>
              <Text style={styles.detailValue}>STU-24-CS-042</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Account Role</Text>
              <Text style={styles.detailValue}>{user?.role || 'Student'}</Text>
            </View>
          </View>

          {/* Working Sign Out Action */}
          <GlassButton
            variant="default"
            size="default"
            onPress={onSignOut}
            style={styles.signOutButton}
          >
            Sign out of Student Account
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
  profileCard: {
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
    gap: 10,
    zIndex: 3,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.50)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.80)',
    marginBottom: 10,
  },
  detailsList: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.70)',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  signOutButton: {
    width: '100%',
    marginTop: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    borderColor: '#EF4444',
    borderRadius: 14,
  },
});
