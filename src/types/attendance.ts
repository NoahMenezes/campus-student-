export type SessionType = 'theory' | 'lab' | 'other';
export type LabBatch = 'C' | 'D';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
export type AttendanceRecordStatus = 'present' | 'absent' | 'pending';
export type LectureCardStatus = 'upcoming' | 'started' | 'present' | 'absent' | 'unmarked';

export interface SubjectDefinition {
  id: string;
  code: string;
  name: string;
  shortName: string;
  type: SessionType;
  category: 'mandatory' | 'elective';
  credits: number;
  semester: number;
}

export interface TimetableSlot {
  id: string;
  day: DayOfWeek;
  startTime: string; // '09:00'
  endTime: string;   // '11:00'
  subjectCode: string;
  subjectName: string;
  type: SessionType;
  batch: 'all' | 'C' | 'D';
  room: string;
  facultyName?: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  date: string; // 'YYYY-MM-DD'
  subjectCode: string;
  subjectName: string;
  type: SessionType;
  status: 'present' | 'absent';
  markedAt: string; // ISO
  batch: LabBatch;
}

export interface LectureSession {
  id: string;
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
}

export interface SubjectAttendanceStats {
  id: string;
  code: string;
  name: string;
  shortName: string;
  type: SessionType;
  category: 'mandatory' | 'elective';
  classesConducted: number;
  classesAttended: number;
  classesAbsent: number;
  percentage: number;
  progressColor: string;
  status: 'safe' | 'warning' | 'critical' | 'empty';
  neededClassesFor75: number;
}

export interface OverallAttendanceSummary {
  totalClasses: number;
  attendedClasses: number;
  absentClasses: number;
  percentage: number;
  hasRecords: boolean;
  safeCount: number;
  atRiskCount: number;
}

export interface DailyAttendanceSummary {
  date: string;
  day: DayOfWeek;
  totalClasses: number;
  attendedClasses: number;
  absentClasses: number;
  unmarkedClasses: number;
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
  percentage: number;
  subjects: {
    code: string;
    name: string;
    type: SessionType;
    attended: number;
    total: number;
    percentage: number;
  }[];
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'lecture_started' | 'attendance_pending' | 'system' | 'warning';
  read: boolean;
  sessionId?: string;
  subjectCode?: string;
}
