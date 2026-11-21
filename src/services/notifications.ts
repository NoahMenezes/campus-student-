import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { AppNotification, LabBatch } from '@/types/attendance';
import {
  formatISTDate,
  generateSessionsForDate,
  getCurrentISTTimeMinutes,
  parseMinutesFromTimeString,
} from './timetable';

const STORAGE_KEY_NOTIFICATIONS = 'konnakol_notifications_v2';
const STORAGE_KEY_DISPATCHED_TODAY = 'konnakol_notifs_dispatched_today';

let NotificationsModule: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  NotificationsModule = require('expo-notifications');
  if (Platform.OS !== 'web' && NotificationsModule?.setNotificationHandler) {
    NotificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch {
  // web or mock
}

export async function getStoredNotifications(): Promise<AppNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const notifs = await getStoredNotifications();
  const updated = notifs.map((n) => (n.id === id ? { ...n, read: true } : n));
  await AsyncStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const notifs = await getStoredNotifications();
  const updated = notifs.map((n) => ({ ...n, read: true }));
  await AsyncStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
}

export async function clearAllNotifications(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_NOTIFICATIONS);
    await AsyncStorage.removeItem(STORAGE_KEY_DISPATCHED_TODAY);
  } catch (err) {
    console.error('Failed to clear notifications:', err);
  }
}

export async function checkAndDispatchLectureAlerts(
  batch: LabBatch
): Promise<AppNotification[]> {
  const now = new Date();
  const todayStr = formatISTDate(now);
  const currentMinutes = getCurrentISTTimeMinutes();
  const todaySessions = generateSessionsForDate(now, batch);

  let dispatchedToday: string[] = [];
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_DISPATCHED_TODAY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === todayStr && Array.isArray(parsed.ids)) {
        dispatchedToday = parsed.ids;
      }
    }
  } catch {
    dispatchedToday = [];
  }

  const existingNotifs = await getStoredNotifications();
  const newNotifs: AppNotification[] = [];

  for (const session of todaySessions) {
    const startMinutes = parseMinutesFromTimeString(session.startTime);

    // If lecture has started (current time >= start time) and not yet alerted today
    if (currentMinutes >= startMinutes && !dispatchedToday.includes(session.id)) {
      const title = `${session.subjectName} has started`;
      const body = `Your ${session.type === 'lab' ? 'Laboratory' : 'lecture'} (${session.subjectCode}) is scheduled from ${session.startTime} to ${session.endTime}. Tap to mark attendance.`;

      const notifItem: AppNotification = {
        id: `notif_${session.id}_${Date.now()}`,
        title,
        body,
        timestamp: new Date().toISOString(),
        type: 'lecture_started',
        read: false,
        sessionId: session.id,
        subjectCode: session.subjectCode,
      };

      newNotifs.push(notifItem);
      dispatchedToday.push(session.id);

      // Trigger native notification if on mobile and permission allowed
      if (Platform.OS !== 'web' && NotificationsModule?.scheduleNotificationAsync) {
        try {
          await NotificationsModule.scheduleNotificationAsync({
            content: {
              title,
              body,
              sound: true,
            },
            trigger: null, // Send immediately
          });
        } catch {
          // silently handle permission lack
        }
      }
    }
  }

  if (newNotifs.length > 0) {
    const combined = [...newNotifs, ...existingNotifs];
    await AsyncStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(combined));
    await AsyncStorage.setItem(
      STORAGE_KEY_DISPATCHED_TODAY,
      JSON.stringify({ date: todayStr, ids: dispatchedToday })
    );
    return combined;
  }

  return existingNotifs;
}
