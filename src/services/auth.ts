import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z.string().trim().email('Enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.confirmPassword !== undefined && data.confirmPassword !== '') {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }
  );

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role?: string;
}

export interface AuthResult {
  user: AuthUser;
  token: string;
}

const TOKEN_KEY = 'campus_student_token';
const USER_KEY = 'campus_student_user';

const isSecureStoreAvailable = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
};

export async function setSession(token: string, user: AuthUser): Promise<void> {
  const useSecure = await isSecureStoreAvailable();
  const userJson = JSON.stringify(user);
  if (useSecure) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, userJson);
  } else {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, userJson);
  }
}

export async function getToken(): Promise<string | null> {
  const useSecure = await isSecureStoreAvailable();
  if (useSecure) {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getUser(): Promise<AuthUser | null> {
  const useSecure = await isSecureStoreAvailable();
  const raw = useSecure
    ? await SecureStore.getItemAsync(USER_KEY)
    : await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return Boolean(token);
}

export async function clearSession(): Promise<void> {
  const useSecure = await isSecureStoreAvailable();
  if (useSecure) {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
  }
  await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
  await AsyncStorage.removeItem(USER_KEY).catch(() => {});
}

const getApiBaseUrl = (): string => {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured && configured.trim().length > 0) {
    return configured.trim().replace(/\/+$/, '');
  }
  // Default to standard localhost backend port
  return 'http://localhost:4000';
};

export async function login(input: LoginInput): Promise<AuthResult> {
  const validated = loginSchema.parse(input);
  const baseUrl = getApiBaseUrl();

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email: validated.email.toLowerCase(),
        password: validated.password,
      }),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network request failed';
    throw new Error(
      `Unable to reach authentication server at ${baseUrl}. ${message}`
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      data.message || data.error || 'Invalid credentials. Please verify your email and password.';
    throw new Error(errorMsg);
  }

  if (!data.token || !data.user) {
    throw new Error('Malformed authentication response from server.');
  }

  const result: AuthResult = {
    token: data.token,
    user: {
      id: String(data.user.id || data.user._id || ''),
      email: data.user.email,
      name: data.user.name || validated.email.split('@')[0],
      role: data.user.role,
    },
  };

  await setSession(result.token, result.user);
  return result;
}

export async function signup(input: SignupInput): Promise<AuthResult> {
  const validated = signupSchema.parse(input);
  const baseUrl = getApiBaseUrl();

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: validated.name,
        email: validated.email.toLowerCase(),
        password: validated.password,
      }),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network request failed';
    throw new Error(
      `Unable to reach authentication server at ${baseUrl}. ${message}`
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      data.message || data.error || 'Unable to create account. Please try again.';
    throw new Error(errorMsg);
  }

  if (!data.token || !data.user) {
    throw new Error('Malformed registration response from server.');
  }

  const result: AuthResult = {
    token: data.token,
    user: {
      id: String(data.user.id || data.user._id || ''),
      email: data.user.email,
      name: data.user.name || validated.name,
      role: data.user.role,
    },
  };

  await setSession(result.token, result.user);
  return result;
}

export async function logout(): Promise<void> {
  await clearSession();
}

