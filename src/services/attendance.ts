import { getApiBaseUrl, type AuthUser } from './auth';

export interface SubjectAttendance {
  id: string;
  code: string;
  name: string;
  type: 'theory' | 'lab';
  category: 'mandatory' | 'elective';
  attended: number;
  total: number;
  percentage: number;
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
  overallPercentage: number;
  attendedClasses: number;
  totalClasses: number;
  subjects: SubjectAttendance[];
  warning: AttendanceWarning | null;
}

export function calculateAttendanceWarning(
  subjects: SubjectAttendance[],
  targetThreshold = 80,
  minRequiredThreshold = 75
): AttendanceWarning | null {
  const atRisk = subjects.find(
    (s) => s.percentage >= minRequiredThreshold && s.percentage < targetThreshold
  );

  if (atRisk) {
    const needed = Math.max(
      1,
      Math.ceil(
        ((targetThreshold / 100) * atRisk.total - atRisk.attended) /
          (1 - targetThreshold / 100)
      )
    );

    return {
      subjectName: atRisk.name,
      percentage: atRisk.percentage,
      neededClasses: needed,
      message: `${atRisk.name} is at ${atRisk.percentage}%. Attend ${needed} more ${needed === 1 ? 'class' : 'classes'} to stay safe.`,
    };
  }

  const critical = subjects.find((s) => s.percentage < minRequiredThreshold);
  if (critical) {
    const needed = Math.max(
      1,
      Math.ceil(
        ((minRequiredThreshold / 100) * critical.total - critical.attended) /
          (1 - minRequiredThreshold / 100)
      )
    );
    return {
      subjectName: critical.name,
      percentage: critical.percentage,
      neededClasses: needed,
      message: `${critical.name} is below 75% (${critical.percentage}%). Attend ${needed} more classes to avoid detention.`,
    };
  }

  return null;
}

export async function fetchAttendanceData(user: AuthUser | null): Promise<AttendanceData> {
  const baseUrl = getApiBaseUrl();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  const res = await fetch(`${baseUrl}/attendance`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`Failed to fetch attendance: ${res.status}`);
  }

  const data = await res.json();

  return {
    semester: String(data.semester || 'Semester 5'),
    overallPercentage: data.overallPercentage ?? 0,
    attendedClasses: data.attendedClasses ?? 0,
    totalClasses: data.totalClasses ?? 0,
    subjects: data.subjects ?? [],
    warning: data.warning ?? null,
  };
}

export async function fetchAttendanceHistory(filter?: string): Promise<{ id: string; subject: string; code: string; date: string; status: string; time?: string }[]> {
  const baseUrl = getApiBaseUrl();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  const url = filter ? `${baseUrl}/attendance/history?filter=${filter}` : `${baseUrl}/attendance/history`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`Failed to fetch attendance history: ${res.status}`);
  }

  const data = await res.json();
  return data.records ?? [];
}

export async function markAttendance(data: {
  studentId: string;
  subjectId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  sessionCode?: string;
}): Promise<{ success: boolean }> {
  const baseUrl = getApiBaseUrl();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  const res = await fetch(`${baseUrl}/attendance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to mark attendance');
  }

  const result = await res.json();
  return { success: !!result.attendance };
}

export async function fetchTimetable(semester?: number): Promise<Record<string, any[]>> {
  const baseUrl = getApiBaseUrl();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  const url = semester !== undefined
    ? `${baseUrl}/timetable?semester=${semester}`
    : `${baseUrl}/timetable`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`Failed to fetch timetable: ${res.status}`);
  }

  const data = await res.json();
  return data.timetable ?? {};
}
