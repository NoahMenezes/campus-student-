import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AttendanceRecord,
  DailyAttendanceSummary,
  LabBatch,
  LectureSession,
  MonthlyAttendanceReport,
  OverallAttendanceSummary,
  SubjectAttendanceStats,
} from '@/types/attendance';
import {
  formatISTDate,
  generateSessionsForDate,
  getDayOfWeekFromDate,
  SEMESTER_5_SUBJECTS,
} from './timetable';

const STORAGE_KEY_RECORDS = 'konnakol_attendance_records_v2';
const STORAGE_KEY_BATCH = 'konnakol_student_batch_v2';

export async function getStudentBatch(): Promise<LabBatch> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_BATCH);
    if (saved === 'D') return 'D';
    return 'C';
  } catch {
    return 'C';
  }
}

export async function setStudentBatch(batch: LabBatch): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_BATCH, batch);
  } catch (err) {
    console.error('Failed to save student batch:', err);
  }
}

export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_RECORDS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function markAttendanceSession(
  session: LectureSession,
  status: 'present' | 'absent',
  batch: LabBatch
): Promise<AttendanceRecord> {
  const records = await getAllAttendanceRecords();
  const existingIndex = records.findIndex((r) => r.sessionId === session.id);

  const newRecord: AttendanceRecord = {
    id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    sessionId: session.id,
    date: session.date,
    subjectCode: session.subjectCode,
    subjectName: session.subjectName,
    type: session.type,
    status,
    markedAt: new Date().toISOString(),
    batch,
  };

  let updatedRecords: AttendanceRecord[];
  if (existingIndex >= 0) {
    updatedRecords = [...records];
    updatedRecords[existingIndex] = newRecord;
  } else {
    updatedRecords = [newRecord, ...records];
  }

  await AsyncStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(updatedRecords));
  return newRecord;
}

export async function clearAllAttendanceRecords(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_RECORDS);
  } catch (err) {
    console.error('Failed to clear records:', err);
  }
}

export async function getTodayAttendanceSummary(batch?: LabBatch): Promise<DailyAttendanceSummary> {
  const activeBatch = batch ?? (await getStudentBatch());
  const now = new Date();
  const dateString = formatISTDate(now);
  const day = getDayOfWeekFromDate(now) || 'Monday';

  const scheduled = generateSessionsForDate(now, activeBatch);
  const records = await getAllAttendanceRecords();
  const recordsMap = new Map<string, AttendanceRecord>();
  records.filter((r) => r.date === dateString).forEach((r) => recordsMap.set(r.sessionId, r));

  let attendedCount = 0;
  let absentCount = 0;
  let unmarkedCount = 0;

  const sessions: LectureSession[] = scheduled.map((s) => {
    const record = recordsMap.get(s.id);
    if (record) {
      if (record.status === 'present') attendedCount++;
      if (record.status === 'absent') absentCount++;
      return {
        ...s,
        status: record.status,
        markedAt: record.markedAt,
      };
    }
    unmarkedCount++;
    return s;
  });

  return {
    date: dateString,
    day,
    totalClasses: scheduled.length,
    attendedClasses: attendedCount,
    absentClasses: absentCount,
    unmarkedClasses: unmarkedCount,
    sessions,
  };
}

export async function getYesterdayAttendanceSummary(batch?: LabBatch): Promise<DailyAttendanceSummary> {
  const activeBatch = batch ?? (await getStudentBatch());
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dateString = formatISTDate(yesterday);
  const day = getDayOfWeekFromDate(yesterday) || 'Monday';

  const scheduled = generateSessionsForDate(yesterday, activeBatch);
  const records = await getAllAttendanceRecords();
  const recordsMap = new Map<string, AttendanceRecord>();
  records.filter((r) => r.date === dateString).forEach((r) => recordsMap.set(r.sessionId, r));

  let attendedCount = 0;
  let absentCount = 0;
  let unmarkedCount = 0;

  const sessions: LectureSession[] = scheduled.map((s) => {
    const record = recordsMap.get(s.id);
    if (record) {
      if (record.status === 'present') attendedCount++;
      if (record.status === 'absent') absentCount++;
      return {
        ...s,
        status: record.status,
        markedAt: record.markedAt,
      };
    }
    unmarkedCount++;
    return {
      ...s,
      status: 'unmarked',
    };
  });

  return {
    date: dateString,
    day,
    totalClasses: scheduled.length,
    attendedClasses: attendedCount,
    absentClasses: absentCount,
    unmarkedClasses: unmarkedCount,
    sessions,
  };
}

export async function getOverallAttendanceSummary(): Promise<OverallAttendanceSummary> {
  const records = await getAllAttendanceRecords();
  if (records.length === 0) {
    return {
      totalClasses: 0,
      attendedClasses: 0,
      absentClasses: 0,
      percentage: 0,
      hasRecords: false,
      safeCount: 0,
      atRiskCount: 0,
    };
  }

  const attended = records.filter((r) => r.status === 'present').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const total = attended + absent;
  const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

  return {
    totalClasses: total,
    attendedClasses: attended,
    absentClasses: absent,
    percentage,
    hasRecords: total > 0,
    safeCount: 0,
    atRiskCount: 0,
  };
}

export async function getSubjectWiseAttendanceStats(): Promise<SubjectAttendanceStats[]> {
  const records = await getAllAttendanceRecords();

  return SEMESTER_5_SUBJECTS.map((subj) => {
    const subjectRecords = records.filter((r) => r.subjectCode === subj.code);
    const attended = subjectRecords.filter((r) => r.status === 'present').length;
    const absent = subjectRecords.filter((r) => r.status === 'absent').length;
    const total = attended + absent;

    let percentage = 0;
    let status: SubjectAttendanceStats['status'] = 'empty';
    let progressColor = '#4B5563'; // neutral gray
    let needed = 0;

    if (total > 0) {
      percentage = Math.round((attended / total) * 100);
      if (percentage >= 75) {
        status = 'safe';
        progressColor = '#10B981'; // vibrant emerald
      } else if (percentage >= 65) {
        status = 'warning';
        progressColor = '#F59E0B'; // amber
        needed = Math.max(1, Math.ceil((0.75 * total - attended) / 0.25));
      } else {
        status = 'critical';
        progressColor = '#EF4444'; // red
        needed = Math.max(1, Math.ceil((0.75 * total - attended) / 0.25));
      }
    }

    return {
      id: subj.id,
      code: subj.code,
      name: subj.name,
      shortName: subj.shortName,
      type: subj.type,
      category: subj.category,
      classesConducted: total,
      classesAttended: attended,
      classesAbsent: absent,
      percentage,
      progressColor,
      status,
      neededClassesFor75: needed,
    };
  });
}

export async function getMonthlyAttendanceReport(
  year: number,
  month: number
): Promise<MonthlyAttendanceReport> {
  const records = await getAllAttendanceRecords();
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

  const monthRecords = records.filter((r) => r.date.startsWith(monthPrefix));
  const attended = monthRecords.filter((r) => r.status === 'present').length;
  const absent = monthRecords.filter((r) => r.status === 'absent').length;
  const total = attended + absent;
  const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

  const dateObj = new Date(year, month - 1, 1);
  const monthName = dateObj.toLocaleString('en-US', { month: 'long' });

  const subjectBreakdown = SEMESTER_5_SUBJECTS.map((subj) => {
    const sRecords = monthRecords.filter((r) => r.subjectCode === subj.code);
    const sAttended = sRecords.filter((r) => r.status === 'present').length;
    const sTotal = sRecords.length;
    const sPct = sTotal > 0 ? Math.round((sAttended / sTotal) * 100) : 0;
    return {
      code: subj.code,
      name: subj.name,
      type: subj.type,
      attended: sAttended,
      total: sTotal,
      percentage: sPct,
    };
  });

  return {
    year,
    month,
    monthName,
    totalScheduled: total,
    attendedClasses: attended,
    absentClasses: absent,
    unmarkedClasses: 0,
    percentage,
    subjects: subjectBreakdown,
  };
}
