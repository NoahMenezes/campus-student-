import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';
import { recordApiTrace } from './demo-mode';

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid campus email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z.string().trim().email('Enter a valid campus email address'),
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
  studentId?: string | null;
  email: string;
  name: string;
  role?: string;
  rollNo?: string | null;
  rollNumber?: string | null;
  department?: string | null;
  semester?: number | null;
  section?: string | null;
  labBatch?: string | null;
  academicYear?: string;
  status?: string | null;
}

export interface AuthResult {
  user: AuthUser;
  token: string;
}

const TOKEN_KEY = 'campus_student_token';
const USER_KEY = 'campus_student_user';

// Global event listeners for { status: "reconnecting" } toast notifications
type ToastListener = (message: string) => void;
const reconnectingListeners = new Set<ToastListener>();
type AuthSessionListener = () => void;
const sessionListeners = new Set<AuthSessionListener>();

export function subscribeAuthSession(listener: AuthSessionListener): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

function notifyAuthSessionChange(): void {
  sessionListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore
    }
  });
}

export function subscribeReconnectingToast(listener: ToastListener): () => void {
  reconnectingListeners.add(listener);
  return () => {
    reconnectingListeners.delete(listener);
  };
}

export function notifyReconnecting(message = 'Database reconnecting... retrying automatically'): void {
  reconnectingListeners.forEach((fn) => {
    try {
      fn(message);
    } catch {
      // ignore subscriber failure
    }
  });
}

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

export const getApiBaseUrl = (): string => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `http://${host}:4000`;
    }
  }
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured && configured.trim().length > 0) {
    return configured.trim().replace(/\/+$/, '');
  }
  return 'http://localhost:4000';
};

export class ApiRequestError extends Error {
  status: number;
  isReconnecting: boolean;
  isNetwork: boolean;

  constructor(message: string, status = 0, isReconnecting = false, isNetwork = false) {
    super(message);
    this.status = status;
    this.isReconnecting = isReconnecting;
    this.isNetwork = isNetwork;
  }
}

export const request = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(input, { ...init, headers: { ...headers, ...(init?.headers || {}) } });
};

export async function apiRequest<T = any>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await request(url, { ...init, signal: init?.signal ?? controller.signal });
    clearTimeout(timeoutId);

    const payload = await response.json().catch(() => ({}));
    const bodyData = payload?.data !== undefined ? payload.data : payload;

    if (payload?.meta && typeof payload.meta === 'object') {
      recordApiTrace({
        method: (init?.method || 'GET').toUpperCase(),
        path,
        status: response.status,
        meta: payload.meta,
      });
    }

    if (
      payload?.status === 'reconnecting' ||
      payload?.data?.status === 'reconnecting'
    ) {
      notifyReconnecting(
        bodyData?.message || 'Database reconnecting... retrying automatically'
      );
      throw new ApiRequestError(
        bodyData?.message || 'Database reconnecting',
        response.status || 503,
        true,
        false
      );
    }

    if (!response.ok) {
      if (response.status === 401 && path !== '/auth/login' && path !== '/auth/register') {
        await clearSession();
      }
      const msg =
        bodyData?.error || bodyData?.message || payload?.error || `Request failed (${response.status})`;
      throw new ApiRequestError(msg, response.status, false, response.status >= 500);
    }

    return bodyData as T;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof ApiRequestError) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiRequestError('Request timed out', 0, false, true);
    }
    throw new ApiRequestError(
      err instanceof Error ? err.message : 'Network error',
      0,
      false,
      true
    );
  }
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const validated = loginSchema.parse(input);
  const data = await apiRequest<{ token: string; user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: validated.email.toLowerCase(),
      password: validated.password,
    }),
  });

  if (!data?.token || !data?.user) {
    throw new Error('Authentication could not be completed.');
  }

  const result: AuthResult = {
    token: data.token,
    user: {
      id: String(data.user.id || data.user._id || ''),
      studentId: data.user.studentId ? String(data.user.studentId) : null,
      email: data.user.email,
      name: data.user.name || validated.email.split('@')[0],
      role: data.user.role || 'student',
      rollNo: data.user.rollNo || null,
      rollNumber: data.user.rollNo || data.user.rollNumber || null,
      department: data.user.department || 'Computer Engineering',
      semester: data.user.semester || 5,
      section: data.user.section || 'B',
      labBatch: data.user.labBatch || 'C',
      status: data.user.status || 'active',
    },
  };

  await setSession(result.token, result.user);
  notifyAuthSessionChange();
  return result;
}

export async function signup(input: SignupInput): Promise<AuthResult> {
  const validated = signupSchema.parse(input);
  const data = await apiRequest<{ token: string; user: any }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: validated.name,
      email: validated.email.toLowerCase(),
      password: validated.password,
    }),
  });

  if (!data?.token || !data?.user) {
    throw new Error('Registration could not be completed.');
  }

  const result: AuthResult = {
    token: data.token,
    user: {
      id: String(data.user.id || data.user._id || ''),
      studentId: data.user.studentId ? String(data.user.studentId) : null,
      email: data.user.email,
      name: data.user.name || validated.name,
      role: data.user.role || 'student',
      rollNo: data.user.rollNo || null,
      rollNumber: data.user.rollNo || data.user.rollNumber || null,
      department: data.user.department || 'Computer Engineering',
      semester: data.user.semester || 5,
      section: data.user.section || 'B',
      labBatch: data.user.labBatch || 'C',
      status: data.user.status || 'active',
    },
  };

  await setSession(result.token, result.user);
  notifyAuthSessionChange();
  return result;
}

export async function logout(): Promise<void> {
  await clearSession();
  notifyAuthSessionChange();
}
