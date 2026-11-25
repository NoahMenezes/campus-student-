import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AttendanceRecord,
  DailyAttendanceSummary,
  DayOfWeek,
  LabBatch,
  LectureSession,
  MonthlyAttendanceReport,
  OfflineAttendanceQueueItem,
  OverallAttendanceSummary,
  RiskTier,
  SubjectAttendanceStats,
} from '@/types/attendance';
import { ApiRequestError } from './auth';
import { markLocalAttendanceMutation } from './attendance-stream';
import {
  fetchAttendanceHistory,
  fetchMe,
  fetchMonthlyStats,
  fetchOverallStats,
  fetchPerSubjectStats,
  fetchTimetable,
  fetchTodayStats,
  putAttendanceMark,
  resetStudentAttendance,
  updateMyBatch,
} from './attendance';
import {
  formatISTDate,
  getCurrentISTTimeMinutes,
  parseMinutesFromTimeString,
} from './timetable';

// AsyncStorage is used ONLY as an offline write queue when PUT /attendance fails on network
const OFFLINE_QUEUE_KEY = 'konnakol_offline_attendance_queue_v1';

const syncListeners = new Set<() => void>();
export function subscribeOfflineQueueChange(listener: () => void): () => void {
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
}
function notifyQueueChange() {
  syncListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore
    }
  });
}

export async function getOfflineQueue(): Promise<OfflineAttendanceQueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getOfflineQueueCount(): Promise<number> {
  const q = await getOfflineQueue();
  return q.length;
}

async function enqueueOfflineMark(item: OfflineAttendanceQueueItem): Promise<void> {
  const queue = await getOfflineQueue();
  const idx = queue.findIndex((q) => q.slotId === item.slotId && q.dateKey === item.dateKey);
  const next = [...queue];
  if (idx >= 0) {
    next[idx] = item;
  } else {
    next.push(item);
  }
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(next));
  notifyQueueChange();
}

export async function flushOfflineQueue(): Promise<{ flushed: number; remaining: number }> {
  const queue = await getOfflineQueue();
  if (queue.length === 0) return { flushed: 0, remaining: 0 };

  const remaining: OfflineAttendanceQueueItem[] = [];
  let flushed = 0;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    try {
      await putAttendanceMark({
        slotId: item.slotId,
        dateKey: item.dateKey,
        status: item.status,
        markedAt: item.markedAt,
        source: 'sync',
      });
      flushed++;
    } catch (err) {
      if (err instanceof ApiRequestError && !err.isNetwork && !err.isReconnecting && err.status < 500) {
        // Deterministic validation error (e.g., future lecture, wrong batch): drop stale item
        continue;
      }
      remaining.push(...queue.slice(i));
      break;
    }
  }

  if (remaining.length === 0) {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY).catch(() => {});
  } else {
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  }
  if (flushed > 0) notifyQueueChange();
  return { flushed, remaining: remaining.length };
}

export async function getStudentBatch(): Promise<LabBatch> {
  try {
    const me = await fetchMe();
    const b = me?.student?.labBatch || me?.student?.batch;
    return b === 'D' ? 'D' : 'C';
  } catch {
    return 'C';
  }
}

export async function setStudentBatch(batch: LabBatch): Promise<void> {
  await updateMyBatch(batch);
}

export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  await flushOfflineQueue().catch(() => {});
  const records = await fetchAttendanceHistory();
  return records.map((r) => ({
    id: String(r.id),
    slotId: r.slotId ? String(r.slotId) : undefined,
    courseId: r.courseId ? String(r.courseId) : undefined,
    sessionId: `${r.dateKey}_${r.slotId || r.id}`,
    date: r.dateKey || formatISTDate(new Date(r.date)),
    dateKey: r.dateKey,
    subjectCode: r.code,
    subjectName: r.subject,
    type: 'theory',
    status: r.status === 'P' ? 'present' : 'absent',
    markedAt: r.date,
    batch: 'C',
    source: r.source,
  }));
}

export async function markAttendanceSession(
  session: LectureSession,
  status: 'present' | 'absent',
  batch: LabBatch
): Promise<AttendanceRecord> {
  const apiStatus: 'P' | 'A' = status === 'present' ? 'P' : 'A';
  const slotId = session.slotId || session.id;
  const dateKey = session.date;
  const markedAtIso = new Date().toISOString();

  await flushOfflineQueue().catch(() => {});

  try {
    markLocalAttendanceMutation();
    const res = await putAttendanceMark({
      slotId,
      dateKey,
      status: apiStatus,
      markedAt: markedAtIso,
      source: 'manual',
    });

    return {
      id: String(res.attendance?._id || `att_${slotId}_${dateKey}`),
      slotId,
      courseId: session.courseId,
      sessionId: session.id,
      date: dateKey,
      dateKey,
      subjectCode: session.subjectCode,
      subjectName: session.subjectName,
      type: session.type,
      status,
      markedAt: res.attendance?.markedAt || markedAtIso,
      batch,
      pendingSync: false,
    };
  } catch (err) {
    // Queue ONLY on network failure or replica-set reconnecting state
    if (err instanceof ApiRequestError && (err.isNetwork || err.isReconnecting)) {
      await enqueueOfflineMark({
        slotId,
        dateKey,
        status: apiStatus,
        markedAt: markedAtIso,
        courseCode: session.subjectCode,
        subjectName: session.subjectName,
      });

      return {
        id: `offline_${slotId}_${dateKey}`,
        slotId,
        courseId: session.courseId,
        sessionId: session.id,
        date: dateKey,
        dateKey,
        subjectCode: session.subjectCode,
        subjectName: session.subjectName,
        type: session.type,
        status,
        markedAt: markedAtIso,
        batch,
        pendingSync: true,
      };
    }
    throw err;
  }
}

export async function clearAllAttendanceRecords(): Promise<void> {
  markLocalAttendanceMutation();
  await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY).catch(() => {});
  notifyQueueChange();
  await resetStudentAttendance();
}

function mapApiSessionsToLectureSessions(
  apiData: Awaited<ReturnType<typeof fetchTodayStats>>,
  queue: OfflineAttendanceQueueItem[],
  isToday: boolean
): {
  sessions: LectureSession[];
  attended: number;
  absent: number;
  unmarked: number;
  pendingSyncCount: number;
} {
  const queueMap = new Map<string, OfflineAttendanceQueueItem>();
  queue.filter((q) => q.dateKey === apiData.dateKey).forEach((q) => queueMap.set(q.slotId, q));

  const currentMinutes = getCurrentISTTimeMinutes();
  let attended = 0;
  let absent = 0;
  let unmarked = 0;
  let pendingSyncCount = 0;

  const sessions: LectureSession[] = apiData.sessions.map((s) => {
    const queued = queueMap.get(String(s._id));
    let uiStatus: LectureSession['status'];
    let pendingSync = false;

    if (queued) {
      uiStatus = queued.status === 'P' ? 'present' : 'absent';
      pendingSync = true;
      pendingSyncCount++;
    } else if (s.status === 'P') {
      uiStatus = 'present';
    } else if (s.status === 'A') {
      uiStatus = 'absent';
    } else if (isToday) {
      const startM = parseMinutesFromTimeString(s.start);
      const endM = parseMinutesFromTimeString(s.end);
      if (currentMinutes < startM) uiStatus = 'upcoming';
      else if (currentMinutes <= endM) uiStatus = 'started';
      else uiStatus = 'unmarked';
    } else {
      uiStatus = 'unmarked';
    }

    if (uiStatus === 'present') attended++;
    else if (uiStatus === 'absent') absent++;
    else unmarked++;

    return {
      id: `${apiData.dateKey}_${s._id}`,
      slotId: String(s._id),
      courseId: String(s.courseId),
      date: apiData.dateKey,
      day: s.day as DayOfWeek,
      startTime: s.start,
      endTime: s.end,
      subjectCode: s.courseCode,
      subjectName: s.courseName,
      type: s.type,
      batch: s.batch === null ? 'all' : s.batch,
      room: s.room,
      status: uiStatus,
      markedAt: queued ? queued.markedAt : s.markedAt,
      pendingSync,
    };
  });

  return { sessions, attended, absent, unmarked, pendingSyncCount };
}

export async function getTodayAttendanceSummary(_batch?: LabBatch): Promise<DailyAttendanceSummary> {
  await flushOfflineQueue().catch(() => {});
  const [apiData, queue] = await Promise.all([fetchTodayStats(), getOfflineQueue()]);
  const mapped = mapApiSessionsToLectureSessions(apiData, queue, true);

  return {
    date: apiData.dateKey,
    day: (apiData.day as DayOfWeek) || 'Monday',
    totalClasses: mapped.sessions.length,
    attendedClasses: mapped.attended,
    absentClasses: mapped.absent,
    unmarkedClasses: mapped.unmarked,
    pendingSyncCount: mapped.pendingSyncCount,
    sessions: mapped.sessions,
  };
}

export async function getYesterdayAttendanceSummary(
  _batch?: LabBatch
): Promise<DailyAttendanceSummary> {
  await flushOfflineQueue().catch(() => {});
  const yesterdayDateKey = formatISTDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const [apiData, queue] = await Promise.all([
    fetchTodayStats(yesterdayDateKey),
    getOfflineQueue(),
  ]);
  const mapped = mapApiSessionsToLectureSessions(apiData, queue, false);

  return {
    date: apiData.dateKey,
    day: (apiData.day as DayOfWeek) || 'Monday',
    totalClasses: mapped.sessions.length,
    attendedClasses: mapped.attended,
    absentClasses: mapped.absent,
    unmarkedClasses: mapped.unmarked,
    pendingSyncCount: mapped.pendingSyncCount,
    sessions: mapped.sessions,
  };
}

export async function getOverallAttendanceSummary(): Promise<OverallAttendanceSummary> {
  await flushOfflineQueue().catch(() => {});
  const data = await fetchOverallStats();
  return {
    totalClasses: data.marked,
    attendedClasses: data.present,
    absentClasses: data.absent,
    percentage: data.percentage,
    hasRecords: data.hasRecords,
    safeCount: 0,
    atRiskCount: 0,
    risk: data.risk,
  };
}

function mapRiskToUiStatus(risk: RiskTier): {
  status: SubjectAttendanceStats['status'];
  progressColor: string;
} {
  if (risk === 'SAFE') return { status: 'safe', progressColor: '#10B981' };
  if (risk === 'AT_RISK') return { status: 'warning', progressColor: '#F59E0B' };
  if (risk === 'DEFAULTER') return { status: 'critical', progressColor: '#EF4444' };
  return { status: 'empty', progressColor: '#4B5563' };
}

export async function getSubjectWiseAttendanceStats(): Promise<SubjectAttendanceStats[]> {
  await flushOfflineQueue().catch(() => {});
  const data = await fetchPerSubjectStats();

  return data.subjects.map((subj) => {
    const uiStyle = mapRiskToUiStatus(subj.risk);
    return {
      id: String(subj.courseId),
      code: subj.code,
      name: subj.name,
      shortName: subj.shortName,
      type: subj.type,
      category: subj.category,
      minAttendance: subj.minAttendance,
      classesConducted: subj.marked,
      classesAttended: subj.present,
      classesAbsent: subj.absent,
      percentage: subj.percentage,
      progressColor: uiStyle.progressColor,
      status: uiStyle.status,
      risk: subj.risk,
      neededClassesFor75: subj.classesNeeded,
    };
  });
}

export async function getMonthlyAttendanceReport(
  year: number,
  month: number
): Promise<MonthlyAttendanceReport> {
  await flushOfflineQueue().catch(() => {});
  const res = await fetchMonthlyStats(year, month);
  const selected = res.selected || {
    year,
    month,
    present: 0,
    absent: 0,
    marked: 0,
    totalScheduled: 0,
    pending: 0,
    percentage: null,
    subjects: [],
  };

  const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });

  return {
    year,
    month,
    monthName,
    totalScheduled: selected.totalScheduled,
    attendedClasses: selected.present,
    absentClasses: selected.absent,
    unmarkedClasses: selected.pending,
    percentage: selected.percentage,
    subjects: selected.subjects.map((s) => ({
      code: s.code,
      name: s.name,
      type: s.type,
      minAttendance: s.minAttendance,
      attended: s.present,
      total: s.marked,
      scheduled: s.scheduled,
      pending: s.pending,
      percentage: s.percentage,
    })),
  };
}

export async function getTimetableSlotsFromApi(day: DayOfWeek, batch?: LabBatch) {
  const res = await fetchTimetable({ day, batch });
  return {
    batch: res.batch,
    slots: res.slots.map((s) => ({
      id: String(s._id),
      slotKey: s.slotKey,
      day: s.day as DayOfWeek,
      startTime: s.start,
      endTime: s.end,
      subjectCode: s.courseCode,
      subjectName: s.courseName,
      type: s.type,
      batch: s.batch === null ? ('all' as const) : (s.batch as 'C' | 'D'),
      room: s.room,
      courseId: String(s.courseId),
    })),
  };
}
