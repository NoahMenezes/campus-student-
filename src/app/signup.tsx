import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
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

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = () => {
    setLoading(true);
    // TODO: wire up real auth
    setTimeout(() => {
      setLoading(false);
      router.replace('/home');
    }, 1200);
  };

  return (
    <View style={styles.root}>
      {/* Dark forest background */}
      <Image
        source={require('@/assets/konnakol_background.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="center"
        priority="high"
      />

      {/* Deep cinematic gradient overlay */}
      <LinearGradient
        colors={[
          'rgba(2, 4, 10, 0.55)',
          'rgba(5, 8, 15, 0.70)',
          'rgba(3, 5, 12, 0.88)',
          'rgba(2, 3, 8, 0.97)',
        ]}
        locations={[0, 0.3, 0.65, 1]}
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
            {/* Brand section */}
            <Animated.View entering={FadeInDown.duration(700).delay(100)} style={styles.brandSection}>
              {/* Logo mark */}
              <View style={styles.logoMark}>
                <View style={styles.logoGlow} />
                <Text style={styles.logoLetter}>K</Text>
              </View>
              <Text style={styles.brandName}>Konnakol</Text>
              <Text style={styles.brandTagline}>Campus Student</Text>
            </Animated.View>

            {/* Signup card */}
            <Animated.View entering={FadeInUp.duration(700).delay(300)} style={styles.cardWrapper}>
              <GlassCard
                intensity="default"
                borderRadius={28}
                style={styles.card}
              >
                <GlassCardContent>
                  <View style={styles.formHeader}>
                    <Text style={styles.formTitle}>Create account</Text>
                    <Text style={styles.formSubtitle}>Join your campus community</Text>
                  </View>

                  {/* Fields */}
                  <View style={styles.fields}>
                    <Animated.View entering={FadeInUp.duration(500).delay(400)}>
                      <Text style={styles.fieldLabel}>Full Name</Text>
                      <GlassInput
                        placeholder="Your full name"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        returnKeyType="next"
                        leftIcon={<Text style={styles.fieldIcon}>👤</Text>}
                      />
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(500).delay(500)}>
                      <Text style={styles.fieldLabel}>Email</Text>
                      <GlassInput
                        placeholder="student@college.edu"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        returnKeyType="next"
                        leftIcon={<Text style={styles.fieldIcon}>✉️</Text>}
                      />
                    </Animated.View>

                    <Animated.View entering={FadeInUp.duration(500).delay(600)}>
                      <Text style={styles.fieldLabel}>Password</Text>
                      <GlassInput
                        placeholder="Create a password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        returnKeyType="done"
                        onSubmitEditing={handleSignup}
                        blurOnSubmit
                        leftIcon={<Text style={styles.fieldIcon}>🔒</Text>}
                        rightIcon={
                          <Text style={styles.fieldIcon}>
                            {showPassword ? '🙈' : '👁️'}
                          </Text>
                        }
                        onRightIconPress={() => setShowPassword(!showPassword)}
                      />
                    </Animated.View>
                  </View>

                  {/* Sign up button */}
                  <Animated.View entering={FadeInUp.duration(500).delay(700)}>
                    <GlassButton
                      variant="default"
                      size="lg"
                      onPress={handleSignup}
                      disabled={loading}
                      style={styles.signupButton}
                    >
                      {loading ? 'Creating account…' : 'Sign Up'}
                    </GlassButton>
                  </Animated.View>

                  {/* Divider */}
                  <Animated.View entering={FadeIn.duration(500).delay(800)} style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                  </Animated.View>

                  {/* Login link */}
                  <Animated.View entering={FadeIn.duration(500).delay(850)} style={styles.loginRow}>
                    <Text style={styles.loginPrompt}>Already have an account?</Text>
                    <Pressable onPress={() => router.push('/login')} hitSlop={8}>
                      <Text style={styles.loginLink}>Log in</Text>
                    </Pressable>
                  </Animated.View>
                </GlassCardContent>
              </GlassCard>
            </Animated.View>

            {/* Footer */}
            <Animated.View entering={FadeIn.duration(600).delay(950)} style={styles.footer}>
              <Text style={styles.footerText}>
                By signing up you agree to our{' '}
                <Text style={styles.footerLink}>Terms</Text>
                {' & '}
                <Text style={styles.footerLink}>Privacy Policy</Text>
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
    backgroundColor: '#02030a',
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
    paddingBottom: 32,
    justifyContent: 'center',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },

  /* Brand */
  brandSection: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    gap: 6,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderTopColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(56,189,248,0.15)',
  },
  logoLetter: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
    zIndex: 1,
  },
  brandName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.8,
  },
  brandTagline: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.50)',
    letterSpacing: 0.5,
  },

  /* Card */
  cardWrapper: {
    width: '100%',
  },
  card: {
    backgroundColor: 'rgba(10,15,30,0.55)',
  },

  /* Form */
  formHeader: {
    marginBottom: 20,
    gap: 4,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.4,
  },
  formSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.50)',
  },
  fields: {
    gap: 14,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.6,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  fieldIcon: {
    fontSize: 15,
  },

  /* Signup button */
  signupButton: {
    width: '100%',
    backgroundColor: 'rgba(56,189,248,0.22)',
    borderColor: 'rgba(56,189,248,0.40)',
    borderTopColor: 'rgba(56,189,248,0.60)',
  },

  /* Divider */
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  dividerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '500',
  },

  /* Login row */
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  loginPrompt: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.50)',
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38bdf8',
  },

  /* Footer */
  footer: {
    marginTop: 20,
    alignItems: 'center',
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.30)',
    textAlign: 'center',
    lineHeight: 16,
  },
  footerLink: {
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
});

