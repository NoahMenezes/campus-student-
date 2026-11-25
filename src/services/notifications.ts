import { AppNotification, LabBatch } from '@/types/attendance';
import { apiRequest } from './auth';

interface ApiNotification {
  _id: string;
  title: string;
  body: string;
  createdAt: string;
  type: 'lecture_started' | 'low_attendance_warning' | 'attendance_marked' | 'system';
  read: boolean;
  slotId?: string | null;
  courseId?: string | null;
}

function mapNotification(n: ApiNotification): AppNotification {
  return {
    id: String(n._id),
    title: n.title,
    body: n.body,
    timestamp: n.createdAt,
    type: n.type === 'attendance_marked' ? 'system' : n.type,
    read: Boolean(n.read),
    sessionId: n.slotId ? String(n.slotId) : undefined,
  };
}

export async function getStoredNotifications(): Promise<AppNotification[]> {
  const res = await apiRequest<{ unreadCount: number; notifications: ApiNotification[] }>(
    '/notifications'
  );
  return (res.notifications || []).map(mapNotification);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const res = await apiRequest<{ unreadCount: number }>('/notifications/unread-count');
  return res.unreadCount ?? 0;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await apiRequest(`/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await apiRequest('/notifications/read-all', {
    method: 'PATCH',
  });
}

export async function clearAllNotifications(): Promise<void> {
  await apiRequest('/notifications', {
    method: 'DELETE',
  });
}

export async function checkAndDispatchLectureAlerts(
  _batch?: LabBatch
): Promise<AppNotification[]> {
  return getStoredNotifications();
}
