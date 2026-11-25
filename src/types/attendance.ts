export type SessionType = 'theory' | 'lab' | 'other';
export type LabBatch = 'C' | 'D';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
export type AttendanceRecordStatus = 'present' | 'absent' | 'pending';
export type LectureCardStatus = 'upcoming' | 'started' | 'present' | 'absent' | 'unmarked';
export type RiskTier = 'SAFE' | 'AT_RISK' | 'DEFAULTER' | 'NO_DATA';

export interface SubjectDefinition {
  id: string;
  code: string;
  name: string;
  shortName: string;
  type: SessionType;
  category: 'mandatory' | 'elective' | 'activity';
  credits: number;
  semester: number;
  minAttendance?: number;
}

export interface TimetableSlot {
  id: string;
  slotKey?: string;
  day: DayOfWeek;
  startTime: string; // '09:00'
  endTime: string;   // '11:00'
  subjectCode: string;
  subjectName: string;
  type: SessionType;
  batch: 'all' | 'C' | 'D';
  room: string;
  facultyName?: string;
  courseId?: string;
}

export interface AttendanceRecord {
  id: string;
  slotId?: string;
  courseId?: string;
  sessionId: string;
  date: string; // 'YYYY-MM-DD'
  dateKey?: string;
  subjectCode: string;
  subjectName: string;
  type: SessionType;
  status: 'present' | 'absent';
  markedAt: string; // ISO
  batch: LabBatch;
  source?: string;
  pendingSync?: boolean;
}

export interface OfflineAttendanceQueueItem {
  slotId: string;
  dateKey: string;
  status: 'P' | 'A';
  markedAt: string;
  courseCode?: string;
  subjectName?: string;
}

export interface LectureSession {
  id: string;
  slotId?: string;
  courseId?: string;
  date: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  subjectCode: string;
  subjectName: string;
  type: SessionType;
  batch: 'all' | 'C' | 'D';
  room: string;
  status: LectureCardStatus;
  markedAt?: string;
  pendingSync?: boolean;
}

export interface SubjectAttendanceStats {
  id: string;
  code: string;
  name: string;
  shortName: string;
  type: SessionType;
  category: 'mandatory' | 'elective' | 'activity';
  minAttendance?: number;
  classesConducted: number;
  classesAttended: number;
  classesAbsent: number;
  percentage: number | null;
  progressColor: string;
  status: 'safe' | 'warning' | 'critical' | 'empty';
  risk?: RiskTier;
  neededClassesFor75: number;
}

export interface OverallAttendanceSummary {
  totalClasses: number;
  attendedClasses: number;
  absentClasses: number;
  percentage: number | null;
  hasRecords: boolean;
  safeCount: number;
  atRiskCount: number;
  risk?: RiskTier;
}

export interface DailyAttendanceSummary {
  date: string;
  day: DayOfWeek;
  totalClasses: number;
  attendedClasses: number;
  absentClasses: number;
  unmarkedClasses: number;
  pendingSyncCount?: number;
  sessions: LectureSession[];
}

export interface MonthlyAttendanceReport {
  year: number;
  month: number;
  monthName: string;
  totalScheduled: number;
  attendedClasses: number;
  absentClasses: number;
  unmarkedClasses: number;
  percentage: number | null;
  subjects: {
    code: string;
    name: string;
    type: SessionType;
    minAttendance?: number;
    attended: number;
    total: number;
    scheduled?: number;
    pending?: number;
    percentage: number | null;
  }[];
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'lecture_started' | 'low_attendance_warning' | 'attendance_marked' | 'system';
  read: boolean;
  sessionId?: string;
  subjectCode?: string;
}
