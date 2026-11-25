import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  GlassButton,
  GlassCard,
  GlassCardContent,
  GlassInput,
} from '@/components/glass';
import { login } from '@/services/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const auth = await login({ email: email.trim(), password });
      if (auth.user.role === 'admin') {
        router.replace('/demo-center' as any);
      } else {
        router.replace('/home');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Dark Forest Background */}
      <Image
        source={require('@/assets/konnakol_background.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="center"
        priority="high"
      />

      {/* Cinematic Deep Dark Gradient Overlay */}
      <LinearGradient
        colors={[
          'rgba(2, 4, 8, 0.60)',
          'rgba(4, 7, 14, 0.80)',
          'rgba(2, 4, 10, 0.94)',
        ]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header: Architectural Typographic Branding */}
            <Animated.View entering={FadeInDown.duration(500).delay(50)} style={styles.header}>
              <Text style={styles.brandTitle}>Konnakol</Text>
              <Text style={styles.brandSubtitle}>Student Portal</Text>
            </Animated.View>

            {/* Login Card: Pointed borders (borderRadius: 0) */}
            <Animated.View entering={FadeInUp.duration(500).delay(150)} style={styles.cardContainer}>
              <GlassCard intensity="default" borderRadius={0} style={styles.card}>
                <GlassCardContent>
                  <View style={styles.cardHeader}>
                    <Text style={styles.formTitle}>Sign in</Text>
                    <Text style={styles.formCaption}>
                      Enter your campus credentials to continue
                    </Text>
                  </View>

                  {/* Pointed Inline Error Banner */}
                  {errorMessage ? (
                    <View style={styles.errorBanner}>
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  ) : null}

                  <View style={styles.fieldGroup}>
                    <View style={styles.fieldBlock}>
                      <Text style={styles.label}>Email</Text>
                      <GlassInput
                        placeholder="student@university.edu"
                        value={email}
                        onChangeText={(val) => {
                          setEmail(val);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        returnKeyType="next"
                        editable={!loading}
                      />
                    </View>

                    <View style={styles.fieldBlock}>
                      <View style={styles.passwordLabelRow}>
                        <Text style={styles.label}>Password</Text>
                      </View>
                      <GlassInput
                        placeholder="Enter your password"
                        value={password}
                        onChangeText={(val) => {
                          setPassword(val);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        returnKeyType="done"
                        onSubmitEditing={handleLogin}
                        blurOnSubmit
                        editable={!loading}
                        rightIcon={
                          <Text style={styles.passwordToggleText}>
                            {showPassword ? 'Hide' : 'Show'}
                          </Text>
                        }
                        onRightIconPress={() => setShowPassword((prev) => !prev)}
                      />
                    </View>
                  </View>

                  {/* Strong Color Primary Button: Sharp Pointed Corners */}
                  <View style={styles.actionBlock}>
                    <GlassButton
                      variant="default"
                      size="lg"
                      onPress={handleLogin}
                      disabled={loading}
                      style={styles.submitButton}
                    >
                      {loading ? (
                        <View style={styles.loadingRow}>
                          <ActivityIndicator size="small" color="#ffffff" />
                          <Text style={styles.loadingText}>Signing in…</Text>
                        </View>
                      ) : (
                        'Sign In'
                      )}
                    </GlassButton>
                  </View>

                  <View style={styles.footerLinkRow}>
                    <Text style={styles.footerPrompt}>Need an account?</Text>
                    <Pressable
                      onPress={() => router.push('/signup')}
                      hitSlop={8}
                      accessibilityRole="button"
                    >
                      <Text style={styles.footerLink}>Create account</Text>
                    </Pressable>
                  </View>
                </GlassCardContent>
              </GlassCard>
            </Animated.View>

            {/* Bottom Note */}
            <Animated.View entering={FadeIn.duration(400).delay(250)} style={styles.systemNote}>
              <Text style={styles.systemNoteText}>
                Konnakol Campus System
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020408',
  },
  safe: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
    justifyContent: 'center',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },

  /* Header */
  header: {
    alignItems: 'center',
    marginBottom: 26,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.6,
  },
  brandSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.50)',
    marginTop: 4,
    letterSpacing: 0.2,
  },

  /* Card */
  cardContainer: {
    width: '100%',
  },
  card: {
    borderRadius: 0,
    backgroundColor: 'rgba(8, 12, 20, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderTopColor: 'rgba(255, 255, 255, 0.22)',
    padding: 22,
  },
  cardHeader: {
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  formCaption: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: 4,
    lineHeight: 18,
  },

  /* Error Banner: Pointed borders */
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.40)',
    borderRadius: 0,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#fca5a5',
    lineHeight: 18,
  },

  /* Form Fields */
  fieldGroup: {
    gap: 16,
    marginBottom: 22,
  },
  fieldBlock: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passwordToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.65)',
    paddingHorizontal: 4,
  },

  /* Action: Strong Color Button, Pointed Corners */
  actionBlock: {
    marginTop: 4,
    marginBottom: 18,
  },
  submitButton: {
    width: '100%',
    backgroundColor: '#0052FF',
    borderColor: '#387BFF',
    borderRadius: 0,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  /* Footer Links */
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  footerPrompt: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.50)',
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38bdf8',
  },

  /* System Note */
  systemNote: {
    alignItems: 'center',
    marginTop: 24,
  },
  systemNoteText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.30)',
    letterSpacing: 0.3,
  },
});
