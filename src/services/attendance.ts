import { apiRequest, type AuthUser } from './auth';
import type { LabBatch, RiskTier } from '@/types/attendance';

export interface SubjectAttendance {
  id: string;
  code: string;
  name: string;
  type: 'theory' | 'lab' | 'other';
  category: 'mandatory' | 'elective' | 'activity';
  minAttendance?: number;
  attended: number;
  missed?: number;
  total: number;
  percentage: number | null;
  classesNeeded?: number;
  risk?: RiskTier;
  progressColor: string;
}

export interface AttendanceWarning {
  subjectName: string;
  percentage: number;
  neededClasses: number;
  message: string;
}

export interface AttendanceData {
  semester: string;
  overallPercentage: number | null;
  attendedClasses: number;
  totalClasses: number;
  subjects: SubjectAttendance[];
  warning: AttendanceWarning | null;
}

export async function fetchOverallStats(batch?: LabBatch) {
  const qs = batch ? `?batch=${encodeURIComponent(batch)}` : '';
  return apiRequest<{
    studentId: string;
    present: number;
    absent: number;
    marked: number;
    percentage: number | null;
    risk: RiskTier;
    hasRecords: boolean;
  }>(`/analytics/overall${qs}`);
}

export async function fetchPerSubjectStats(semester?: number, batch?: LabBatch) {
  const params = new URLSearchParams();
  if (semester) params.set('semester', String(semester));
  if (batch) params.set('batch', batch);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<{
    semester: number;
    batch: LabBatch;
    subjects: {
      courseId: string;
      code: string;
      name: string;
      shortName: string;
      type: 'theory' | 'lab' | 'other';
      category: 'mandatory' | 'elective' | 'activity';
      minAttendance: number;
      present: number;
      absent: number;
      marked: number;
      percentage: number | null;
      classesNeeded: number;
      risk: RiskTier;
    }[];
  }>(`/analytics/subjects${qs}`);
}

export async function fetchTodayStats(dateKey?: string) {
  const qs = dateKey ? `?dateKey=${encodeURIComponent(dateKey)}` : '';
  return apiRequest<{
    dateKey: string;
    day: string;
    section: string;
    batch: LabBatch;
    Total: number;
    Present: number;
    Absent: number;
    Pending: number;
    marked: number;
    percentage: number | null;
    sessions: {
      _id: string;
      slotKey: string;
      day: string;
      start: string;
      end: string;
      courseId: string;
      courseCode: string;
      courseName: string;
      type: 'theory' | 'lab' | 'other';
      batch: 'C' | 'D' | null;
      room: string;
      status: 'P' | 'A' | 'PENDING';
      markedAt?: string;
      source?: string;
    }[];
  }>(`/analytics/today${qs}`);
}

export async function fetchMonthlyStats(year: number, month: number) {
  return apiRequest<{
    months: any[];
    selected: {
      year: number;
      month: number;
      present: number;
      absent: number;
      marked: number;
      totalScheduled: number;
      pending: number;
      percentage: number | null;
      subjects: {
        courseId: string;
        code: string;
        name: string;
        shortName: string;
        type: 'theory' | 'lab' | 'other';
        minAttendance: number;
        present: number;
        absent: number;
        marked: number;
        scheduled: number;
        pending: number;
        percentage: number | null;
      }[];
    } | null;
  }>(`/analytics/monthly?year=${year}&month=${month}`);
}

export async function fetchAttendanceData(_user?: AuthUser | null): Promise<AttendanceData> {
  const data = await apiRequest<any>('/attendance');
  const subjects: SubjectAttendance[] = data.subjects ?? [];
  const critical = subjects.find((s) => s.risk === 'DEFAULTER');
  const atRisk = subjects.find((s) => s.risk === 'AT_RISK');
  const flagged = critical || atRisk;

  return {
    semester: String(data.semester || 'Semester 5'),
    overallPercentage: data.overallPercentage ?? null,
    attendedClasses: data.attendedClasses ?? 0,
    totalClasses: data.totalClasses ?? 0,
    subjects,
    warning:
      flagged && flagged.percentage !== null
        ? {
            subjectName: flagged.name,
            percentage: flagged.percentage,
            neededClasses: flagged.classesNeeded ?? 0,
            message: `${flagged.name} is at ${flagged.percentage}%. Attend ${flagged.classesNeeded ?? 0} more classes.`,
          }
        : null,
  };
}

export async function fetchAttendanceHistory(
  filter?: string
): Promise<
  {
    id: string;
    courseId?: string;
    slotId?: string;
    subject: string;
    code: string;
    dateKey: string;
    date: string;
    status: string;
    source?: string;
    time?: string;
  }[]
> {
  const qs = filter ? `?filter=${encodeURIComponent(filter)}` : '';
  const data = await apiRequest<{ records: any[] }>(`/attendance/history${qs}`);
  return data.records ?? [];
}

export async function putAttendanceMark(payload: {
  slotId: string;
  dateKey: string;
  status: 'P' | 'A';
  markedAt?: string;
  source?: string;
}) {
  return apiRequest<{
    attendance: any;
    upserted: boolean;
    statusChanged: boolean;
    auditLogged: boolean;
  }>('/attendance', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAttendanceMark(payload: { slotId: string; dateKey: string }) {
  return apiRequest<{ deletedCount: number }>('/attendance', {
    method: 'DELETE',
    body: JSON.stringify(payload),
  });
}

export async function resetStudentAttendance() {
  return apiRequest<{ deletedCount: number }>('/attendance/reset', {
    method: 'DELETE',
  });
}

export async function fetchTimetable(params?: {
  day?: string;
  semester?: number;
  section?: string;
  batch?: LabBatch;
}): Promise<{
  semester: number;
  section: string;
  batch: LabBatch;
  slots: any[];
  timetable: Record<string, any[]>;
}> {
  const qs = new URLSearchParams();
  if (params?.day) qs.set('day', params.day);
  if (params?.semester !== undefined) qs.set('semester', String(params.semester));
  if (params?.section) qs.set('section', params.section);
  if (params?.batch) qs.set('batch', params.batch);
  const queryStr = qs.toString() ? `?${qs.toString()}` : '';
  return apiRequest(`/timetable${queryStr}`);
}

export async function fetchMe() {
  return apiRequest<{ user: any; student: any }>('/me');
}

export async function updateMyBatch(labBatch: LabBatch) {
  return apiRequest<{ studentId: string; labBatch: LabBatch }>('/me/batch', {
    method: 'PATCH',
    body: JSON.stringify({ labBatch }),
  });
}
