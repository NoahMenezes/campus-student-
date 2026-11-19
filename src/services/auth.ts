import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

const TOKEN_KEY = 'campus_student_token';
const USER_KEY = 'campus_student_user';

export async function setSession(token: string, user: { id: string; email: string; name: string }) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getUser(): Promise<{ id: string; email: string; name: string } | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export type AuthUser = { id: string; email: string; name: string };

interface AuthResult {
  user: AuthUser;
  token: string;
}

export async function login(input: LoginInput): Promise<AuthResult> {
  'use server';
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: input.email.toLowerCase(), password: input.password }),
  });
  if (!response.ok) throw new Error('Invalid email or password');
  const data = await response.json();
  await setSession(data.token, { id: data.user.id, email: data.user.email, name: data.user.name });
  return { user: data.user, token: data.token };
}

export async function signup(input: SignupInput): Promise<AuthResult> {
  'use server';
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: input.name, email: input.email.toLowerCase(), password: input.password }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Signup failed');
  }
  const data = await response.json();
  await setSession(data.token, { id: data.user.id, email: data.user.email, name: data.user.name });
  return { user: data.user, token: data.token };
}

export async function logout() {
  await clearSession();
}
