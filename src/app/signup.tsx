import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRef, useState } from 'react';

import { signup, signupSchema } from '@/services/auth';

const BRAND = '#208AEF';
const BG = '#000000';

export default function SignupScreen({ onSignup }: { onSignup: () => void }) {

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const confirmRef = useRef<any>(null);
  const emailRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);

  const validate = () => {
    const result = signupSchema.safeParse({ name, email, password, confirmPassword });
    if (!result.success) {
      setError(result.error.issues[0]?.message || 'Invalid input');
      return false;
    }
    setError(null);
    return true;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setError(null);
    try {
      await signup({ name, email, password, confirmPassword });
      onSignup();
    } catch (err: any) {
      setError(err?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[{ flex: 1, backgroundColor: BG }]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        enabled>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ alignItems: 'center', marginBottom: 56 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                backgroundColor: BRAND,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 28 }}>K</Text>
            </View>
            <Text style={{ marginTop: 20, color: '#fff', fontSize: 30, fontWeight: '700' }}>Create account</Text>
            <Text style={{ marginTop: 6, color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Join campus-student</Text>
          </View>

          {error && (
            <Text style={{ color: '#ff6b6b', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</Text>
          )}

          <View style={{ gap: 16 }}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 16,
                color: '#fff',
                fontSize: 16,
              }}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
            <TextInput
              ref={emailRef}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 16,
                color: '#fff',
                fontSize: 16,
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.45)"
              secureTextEntry
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 16,
                color: '#fff',
                fontSize: 16,
              }}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            <TextInput
              ref={confirmRef}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              placeholderTextColor="rgba(255,255,255,0.45)"
              secureTextEntry
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 16,
                color: '#fff',
                fontSize: 16,
              }}
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />
          </View>

          <TouchableOpacity
            onPress={onSubmit}
            style={{
              marginTop: 8,
              backgroundColor: loading ? 'rgba(34,138,239,0.5)' : BRAND,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: loading ? 0.7 : 1,
            }}
            disabled={loading}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
              {loading ? 'Creating account...' : 'Sign up'}
            </Text>
          </TouchableOpacity>

          <View style={{ marginTop: 26, flexDirection: 'row', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Already have an account?</Text>
            <TouchableOpacity onPress={() => {}}>
              <Text style={{ color: BRAND, fontWeight: '700', fontSize: 14 }}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
