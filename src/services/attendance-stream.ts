import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { getApiBaseUrl, getUser, isAuthenticated } from './auth';

export interface AttendanceChangeEvent {
  operationType: 'insert' | 'update' | 'replace' | 'delete';
  documentId: string | null;
  studentId: string | null;
  studentName: string | null;
  rollNo: string | null;
  dateKey: string | null;
  slotId: string | null;
  courseId: string | null;
  status: 'P' | 'A' | null;
  markedAt: string | null;
  overall: {
    present: number;
    absent: number;
    marked: number;
    percentage: number | null;
    risk: string;
  } | null;
  droppedBelow75: boolean;
  ts: string;
}

export interface LowAttendanceAlert {
  studentId: string;
  studentName: string;
  rollNo: string;
  percentage: number;
  marked: number;
  present: number;
  absent: number;
  message: string;
  ts: string;
}

type ChangeListener = (event: AttendanceChangeEvent) => void;
type AlertListener = (alert: LowAttendanceAlert) => void;

const changeListeners = new Set<ChangeListener>();
const alertListeners = new Set<AlertListener>();

let running = false;
let webEventSource: EventSource | null = null;
let nativeXhr: XMLHttpRequest | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let lastLocalMutationAt = 0;

export function markLocalAttendanceMutation(): void {
  lastLocalMutationAt = Date.now();
}

export function isRecentLocalMutation(windowMs = 1500): boolean {
  return Date.now() - lastLocalMutationAt < windowMs;
}

export function subscribeAttendanceLiveChange(listener: ChangeListener): () => void {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

export function subscribeLowAttendanceAlert(listener: AlertListener): () => void {
  alertListeners.add(listener);
  return () => {
    alertListeners.delete(listener);
  };
}

/**
 * Subscribe a screen loader to live SSE attendance changes originating from other devices.
 */
export function useAttendanceLiveSync(onRefresh: () => void): void {
  const cbRef = useRef(onRefresh);
  useEffect(() => {
    cbRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = subscribeAttendanceLiveChange(async (ev) => {
      if (isRecentLocalMutation()) return;
      const u = await getUser().catch(() => null);
      if (u?.studentId && ev.studentId && u.studentId !== ev.studentId) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cbRef.current(), 120);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, []);
}

async function dispatchChangeEvent(payload: AttendanceChangeEvent): Promise<void> {
  changeListeners.forEach((fn) => {
    try {
      fn(payload);
    } catch {
      // ignore subscriber failure
    }
  });
}

async function dispatchLowAlert(payload: LowAttendanceAlert): Promise<void> {
  const user = await getUser().catch(() => null);
  // Show alert banner for the affected student or for an observing admin
  if (user && user.role !== 'admin' && user.studentId && user.studentId !== payload.studentId) {
    return;
  }
  alertListeners.forEach((fn) => {
    try {
      fn(payload);
    } catch {
      // ignore
    }
  });
}

function parseSseChunkBuffer(buffer: string): { rest: string; frames: { event: string; data: string }[] } {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const parts = normalized.split('\n\n');
  const rest = parts.pop() || '';
  const frames: { event: string; data: string }[] = [];

  for (const rawBlock of parts) {
    const lines = rawBlock.split('\n');
    let eventName = 'message';
    const dataLines: string[] = [];
    for (const line of lines) {
      if (!line || line.startsWith(':')) continue;
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }
    if (dataLines.length > 0) {
      frames.push({ event: eventName, data: dataLines.join('\n') });
    }
  }

  return { rest, frames };
}

function handleParsedFrame(eventName: string, rawData: string): void {
  try {
    const parsed = JSON.parse(rawData);
    if (eventName === 'attendance_change') {
      dispatchChangeEvent(parsed as AttendanceChangeEvent);
    } else if (eventName === 'low_attendance_alert') {
      dispatchLowAlert(parsed as LowAttendanceAlert);
    }
  } catch {
    // ignore malformed frame
  }
}

function scheduleReconnect(): void {
  if (!running || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (running) connectStream();
  }, 3000);
}

async function connectStream(): Promise<void> {
  if (!running) return;
  const authed = await isAuthenticated().catch(() => false);
  if (!authed) return;

  const url = `${getApiBaseUrl()}/demo/attendance-stream`;

  if (Platform.OS === 'web' && typeof EventSource !== 'undefined') {
    if (webEventSource) {
      webEventSource.close();
      webEventSource = null;
    }
    const es = new EventSource(url);
    webEventSource = es;

    es.addEventListener('attendance_change', (e) => {
      handleParsedFrame('attendance_change', (e as MessageEvent).data);
    });
    es.addEventListener('low_attendance_alert', (e) => {
      handleParsedFrame('low_attendance_alert', (e as MessageEvent).data);
    });
    es.onerror = () => {
      es.close();
      if (webEventSource === es) webEventSource = null;
      scheduleReconnect();
    };
    return;
  }

  // Native RN fallback using progressive XMLHttpRequest SSE parser
  if (typeof XMLHttpRequest !== 'undefined') {
    if (nativeXhr) {
      nativeXhr.abort();
      nativeXhr = null;
    }
    const xhr = new XMLHttpRequest();
    nativeXhr = xhr;
    let processedLen = 0;
    let carryBuffer = '';

    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'text/event-stream');

    xhr.onprogress = () => {
      const fullText = xhr.responseText || '';
      if (fullText.length <= processedLen) return;
      const chunk = fullText.slice(processedLen);
      processedLen = fullText.length;
      const { rest, frames } = parseSseChunkBuffer(carryBuffer + chunk);
      carryBuffer = rest;
      for (const frame of frames) {
        handleParsedFrame(frame.event, frame.data);
      }
    };

    xhr.onerror = () => {
      if (nativeXhr === xhr) nativeXhr = null;
      scheduleReconnect();
    };
    xhr.onloadend = () => {
      if (nativeXhr === xhr) nativeXhr = null;
      scheduleReconnect();
    };
    xhr.send();
  }
}

export function startAttendanceStream(): void {
  if (running) return;
  running = true;
  connectStream().catch(() => {});
}

export function stopAttendanceStream(): void {
  running = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (webEventSource) {
    webEventSource.close();
    webEventSource = null;
  }
  if (nativeXhr) {
    nativeXhr.abort();
    nativeXhr = null;
  }
}
