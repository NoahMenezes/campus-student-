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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.replace('/home');
    }, 1200);
  };

  return (
    <View style={styles.root}>
      <Image
        source={require('@/assets/konnakol_background.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="center"
        priority="high"
      />
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
            <Animated.View entering={FadeInDown.duration(700).delay(100)} style={styles.brandSection}>
              <View style={styles.logoMark}>
                <View style={styles.logoGlow} />
                <Text style={styles.logoLetter}>K</Text>
              </View>
              <Text style={styles.brandName}>Konnakol</Text>
              <Text style={styles.brandTagline}>Welcome back</Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(700).delay(300)} style={styles.cardWrapper}>
              <GlassCard intensity="default" borderRadius={28} style={styles.card}>
                <GlassCardContent>
                  <View style={styles.formHeader}>
                    <Text style={styles.formTitle}>Sign in</Text>
                    <Text style={styles.formSubtitle}>Continue to your campus</Text>
                  </View>

                  <View style={styles.fields}>
                    <Animated.View entering={FadeInUp.duration(500).delay(400)}>
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

                    <Animated.View entering={FadeInUp.duration(500).delay(500)}>
                      <Text style={styles.fieldLabel}>Password</Text>
                      <GlassInput
                        placeholder="Your password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        returnKeyType="done"
                        onSubmitEditing={handleLogin}
                        blurOnSubmit
                        leftIcon={<Text style={styles.fieldIcon}>🔒</Text>}
                        rightIcon={<Text style={styles.fieldIcon}>{showPassword ? '🙈' : '👁️'}</Text>}
                        onRightIconPress={() => setShowPassword(!showPassword)}
                      />
                    </Animated.View>
                  </View>

                  <Animated.View entering={FadeInUp.duration(500).delay(600)}>
                    <GlassButton
                      variant="default"
                      size="lg"
                      onPress={handleLogin}
                      disabled={loading}
                      style={styles.loginButton}
                    >
                      {loading ? 'Signing in…' : 'Sign In'}
                    </GlassButton>
                  </Animated.View>

                  <Animated.View entering={FadeIn.duration(500).delay(700)} style={styles.signupRow}>
                    <Text style={styles.signupPrompt}>{"Don't have an account?"}</Text>
                    <Pressable onPress={() => router.replace('/signup')} hitSlop={8}>
                      <Text style={styles.signupLink}>Sign up</Text>
                    </Pressable>
                  </Animated.View>
                </GlassCardContent>
              </GlassCard>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#02030a' },
  safe: { flex: 1 },
  keyboardAvoid: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
    justifyContent: 'center',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  brandSection: { alignItems: 'center', paddingTop: 40, paddingBottom: 28, gap: 6 },
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
  logoLetter: { fontSize: 34, fontWeight: '800', color: '#ffffff', letterSpacing: -1, zIndex: 1 },
  brandName: { fontSize: 30, fontWeight: '800', color: '#ffffff', letterSpacing: -0.8 },
  brandTagline: { fontSize: 14, fontWeight: '400', color: 'rgba(255,255,255,0.50)', letterSpacing: 0.5 },
  cardWrapper: { width: '100%' },
  card: { backgroundColor: 'rgba(10,15,30,0.55)' },
  formHeader: { marginBottom: 20, gap: 4 },
  formTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff', letterSpacing: -0.4 },
  formSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.50)' },
  fields: { gap: 14, marginBottom: 20 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.6,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  fieldIcon: { fontSize: 15 },
  loginButton: {
    width: '100%',
    backgroundColor: 'rgba(56,189,248,0.22)',
    borderColor: 'rgba(56,189,248,0.40)',
    borderTopColor: 'rgba(56,189,248,0.60)',
  },
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 18 },
  signupPrompt: { fontSize: 13, color: 'rgba(255,255,255,0.50)' },
  signupLink: { fontSize: 13, fontWeight: '700', color: '#38bdf8' },
});
