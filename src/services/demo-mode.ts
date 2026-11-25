import AsyncStorage from '@react-native-async-storage/async-storage';

const DEMO_MODE_STORAGE_KEY = 'campus_student_demo_mode_v1';

export interface DemoConcept {
  topic: number;
  topicName: string;
  operators: string[];
  why: string;
}

export interface DemoTraceMeta {
  ms: number;
  concepts: DemoConcept[];
  queries: Record<string, unknown>[];
}

export interface DemoTraceEntry {
  id: string;
  method: string;
  path: string;
  actionLabel: string;
  status: number;
  timestamp: string;
  meta: DemoTraceMeta;
}

export interface DemoModeSnapshot {
  enabled: boolean;
  hydrated: boolean;
  sheetOpen: boolean;
  activeTraceId: string | null;
  burstTraces: DemoTraceEntry[];
  history: DemoTraceEntry[];
}

type DemoListener = (snap: DemoModeSnapshot) => void;
type ToastListener = (message: string) => void;

const listeners = new Set<DemoListener>();
const toastListeners = new Set<ToastListener>();

let enabled = false;
let hydrated = false;
let sheetOpen = false;
let activeTraceId: string | null = null;
let burstTraces: DemoTraceEntry[] = [];
let history: DemoTraceEntry[] = [];
let lastBurstAt = 0;
let seq = 0;

function stripQueryString(path: string): string {
  const withoutOrigin = path.replace(/^https?:\/\/[^/]+/i, '');
  const idx = withoutOrigin.indexOf('?');
  return idx >= 0 ? withoutOrigin.slice(0, idx) : withoutOrigin;
}

function inferActionLabel(method: string, rawPath: string): string {
  const path = stripQueryString(rawPath);
  if (method === 'PUT' && path === '/attendance') return 'Mark Attendance';
  if (method === 'DELETE' && path === '/attendance') return 'Undo Attendance Mark';
  if (method === 'DELETE' && path === '/attendance/reset') return 'Reset Attendance';
  if (method === 'PATCH' && path === '/me/batch') return 'Change Lab Batch';
  if (method === 'GET' && path === '/me') return 'Load Student Profile';
  if (method === 'GET' && path === '/analytics/overall') return 'Overall Analytics';
  if (method === 'GET' && (path === '/analytics/subjects' || path === '/analytics/per-subject')) {
    return 'Subjects Analytics';
  }
  if (method === 'GET' && path === '/analytics/today') return 'Daily Schedule Analytics';
  if (method === 'GET' && path === '/analytics/monthly') return 'Monthly Report';
  if (method === 'GET' && path === '/timetable') return 'Timetable Query';
  if (method === 'GET' && path === '/attendance/history') return 'Attendance History';
  if (method === 'GET' && path === '/notifications/unread-count') return 'Notification Badge';
  if (method === 'GET' && path === '/notifications') return 'Load Notifications';
  if ((method === 'PATCH' || method === 'POST') && path === '/notifications/read-all') {
    return 'Mark All Read';
  }
  if (method === 'PATCH' && path.startsWith('/notifications/')) return 'Mark Notification Read';
  if (method === 'DELETE' && path === '/notifications') return 'Clear Notifications';
  if (method === 'POST' && path === '/auth/login') return 'Sign In';
  if (method === 'POST' && path === '/auth/register') return 'Create Account';
  return `${method} ${path}`;
}

function tracePriority(entry: DemoTraceEntry): number {
  const m = entry.method;
  if (m === 'PUT' || m === 'PATCH' || m === 'POST' || m === 'DELETE') return 100;
  const p = stripQueryString(entry.path);
  if (p === '/analytics/subjects' || p === '/analytics/monthly' || p === '/analytics/today') return 80;
  if (p === '/timetable' || p === '/attendance/history' || p === '/notifications') return 70;
  if (p === '/analytics/overall') return 60;
  return 20;
}

function getSnapshot(): DemoModeSnapshot {
  return {
    enabled,
    hydrated,
    sheetOpen,
    activeTraceId,
    burstTraces: [...burstTraces],
    history: [...history],
  };
}

function emit(): void {
  const snap = getSnapshot();
  listeners.forEach((fn) => {
    try {
      fn(snap);
    } catch {
      // ignore subscriber failure
    }
  });
}

function emitToast(message: string): void {
  toastListeners.forEach((fn) => {
    try {
      fn(message);
    } catch {
      // ignore
    }
  });
}

export function subscribeDemoMode(listener: DemoListener): () => void {
  listeners.add(listener);
  listener(getSnapshot());
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeDemoToast(listener: ToastListener): () => void {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
}

export async function hydrateDemoMode(): Promise<boolean> {
  if (hydrated) return enabled;
  try {
    const saved = await AsyncStorage.getItem(DEMO_MODE_STORAGE_KEY);
    enabled = saved === 'true';
  } catch {
    enabled = false;
  } finally {
    hydrated = true;
    emit();
  }
  return enabled;
}

export function isDemoModeEnabled(): boolean {
  return enabled;
}

export async function setDemoModeEnabled(next: boolean): Promise<boolean> {
  enabled = next;
  hydrated = true;
  await AsyncStorage.setItem(DEMO_MODE_STORAGE_KEY, next ? 'true' : 'false').catch(() => {});

  if (next) {
    if (burstTraces.length === 0 && history.length > 0) {
      burstTraces = history.slice(0, 6);
      const best = [...burstTraces].sort((a, b) => tracePriority(b) - tracePriority(a))[0];
      activeTraceId = best ? best.id : burstTraces[0].id;
    }
    sheetOpen = burstTraces.length > 0;
    emitToast('Demo Mode ON — MongoDB Inspector enabled');
  } else {
    sheetOpen = false;
    emitToast('Demo Mode OFF');
  }

  emit();
  return enabled;
}

export async function toggleDemoMode(): Promise<boolean> {
  return setDemoModeEnabled(!enabled);
}

export function closeDemoSheet(): void {
  sheetOpen = false;
  emit();
}

export function openDemoSheet(): void {
  if (burstTraces.length === 0 && history.length > 0) {
    burstTraces = history.slice(0, 6);
    activeTraceId = burstTraces[0].id;
  }
  if (burstTraces.length > 0) {
    sheetOpen = true;
    emit();
  }
}

export function setActiveDemoTrace(id: string): void {
  activeTraceId = id;
  emit();
}

export function recordApiTrace(input: {
  method: string;
  path: string;
  status: number;
  meta: Partial<DemoTraceMeta>;
}): void {
  const cleanMeta: DemoTraceMeta = {
    ms: typeof input.meta?.ms === 'number' ? input.meta.ms : 0,
    concepts: Array.isArray(input.meta?.concepts) ? input.meta.concepts : [],
    queries: Array.isArray(input.meta?.queries) ? input.meta.queries : [],
  };

  seq += 1;
  const entry: DemoTraceEntry = {
    id: `trace_${Date.now()}_${seq}`,
    method: input.method.toUpperCase(),
    path: stripQueryString(input.path) + (input.path.includes('?') ? input.path.slice(input.path.indexOf('?')) : ''),
    actionLabel: inferActionLabel(input.method.toUpperCase(), input.path),
    status: input.status,
    timestamp: new Date().toISOString(),
    meta: cleanMeta,
  };

  history = [entry, ...history].slice(0, 25);

  const now = Date.now();
  const isNewBurst = !sheetOpen || now - lastBurstAt > 1800;
  lastBurstAt = now;

  if (isNewBurst) {
    burstTraces = [entry];
    activeTraceId = entry.id;
  } else {
    burstTraces = [...burstTraces, entry];
    const current = burstTraces.find((t) => t.id === activeTraceId);
    if (!current || tracePriority(entry) > tracePriority(current)) {
      activeTraceId = entry.id;
    }
  }

  if (enabled) {
    sheetOpen = true;
  }

  emit();
}
