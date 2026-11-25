import type {
  DayOfWeek,
  LabBatch,
  LectureSession,
  SubjectDefinition,
  TimetableSlot,
} from '@/types/attendance';

export const SEMESTER_5_SUBJECTS: SubjectDefinition[] = [
  {
    id: 'sub_dbms_th',
    code: 'CECMP300',
    name: 'Database Management Systems',
    shortName: 'DBMS',
    type: 'theory',
    category: 'mandatory',
    credits: 3,
    semester: 5,
  },
  {
    id: 'sub_dbms_pr',
    code: 'CECMP301',
    name: 'Database Management Systems Lab',
    shortName: 'DBMS Lab',
    type: 'lab',
    category: 'mandatory',
    credits: 1,
    semester: 5,
  },
  {
    id: 'sub_dccn_th',
    code: 'CECMP302',
    name: 'Data Communication & Computer Networks',
    shortName: 'DCCN',
    type: 'theory',
    category: 'mandatory',
    credits: 3,
    semester: 5,
  },
  {
    id: 'sub_dccn_pr',
    code: 'CECMP303',
    name: 'Data Communication & Computer Networks Lab',
    shortName: 'DCCN Lab',
    type: 'lab',
    category: 'mandatory',
    credits: 1,
    semester: 5,
  },
  {
    id: 'sub_ai_th',
    code: 'CECMP304',
    name: 'Artificial Intelligence',
    shortName: 'AI',
    type: 'theory',
    category: 'mandatory',
    credits: 3,
    semester: 5,
  },
  {
    id: 'sub_ai_pr',
    code: 'CECMP305',
    name: 'Artificial Intelligence Lab',
    shortName: 'AI Lab',
    type: 'lab',
    category: 'mandatory',
    credits: 1,
    semester: 5,
  },
  {
    id: 'sub_daa_th',
    code: 'CECMP306',
    name: 'Design & Analysis of Algorithms',
    shortName: 'DAA',
    type: 'theory',
    category: 'mandatory',
    credits: 3,
    semester: 5,
  },
  {
    id: 'sub_daa_pr',
    code: 'CECMP307',
    name: 'Design & Analysis of Algorithms Lab',
    shortName: 'DAA Lab',
    type: 'lab',
    category: 'mandatory',
    credits: 1,
    semester: 5,
  },
  {
    id: 'sub_sc_th',
    code: 'CECMP325',
    name: 'Soft Computing',
    shortName: 'SC',
    type: 'theory',
    category: 'elective',
    credits: 3,
    semester: 5,
  },
  {
    id: 'sub_sc_pr',
    code: 'CECMP326',
    name: 'Soft Computing Lab',
    shortName: 'SC Lab',
    type: 'lab',
    category: 'elective',
    credits: 1,
    semester: 5,
  },
];

export const TIMETABLE_SLOTS: TimetableSlot[] = [
  // MONDAY
  {
    id: 'mon_lab_c',
    day: 'Monday',
    startTime: '09:00',
    endTime: '11:00',
    subjectCode: 'CECMP307',
    subjectName: 'DAA Lab',
    type: 'lab',
    batch: 'C',
    room: 'Lab 3',
  },
  {
    id: 'mon_lab_d',
    day: 'Monday',
    startTime: '09:00',
    endTime: '11:00',
    subjectCode: 'CECMP326',
    subjectName: 'SC Lab',
    type: 'lab',
    batch: 'D',
    room: 'Lab 4',
  },
  {
    id: 'mon_dbms',
    day: 'Monday',
    startTime: '11:15',
    endTime: '12:15',
    subjectCode: 'CECMP300',
    subjectName: 'DBMS',
    type: 'theory',
    batch: 'all',
    room: 'CR-204',
  },
  {
    id: 'mon_ai',
    day: 'Monday',
    startTime: '12:15',
    endTime: '13:15',
    subjectCode: 'CECMP304',
    subjectName: 'AI',
    type: 'theory',
    batch: 'all',
    room: 'CR-204',
  },
  {
    id: 'mon_dccn',
    day: 'Monday',
    startTime: '14:00',
    endTime: '15:00',
    subjectCode: 'CECMP302',
    subjectName: 'DCCN',
    type: 'theory',
    batch: 'all',
    room: 'CR-204',
  },
  {
    id: 'mon_sc',
    day: 'Monday',
    startTime: '15:00',
    endTime: '16:00',
    subjectCode: 'CECMP325',
    subjectName: 'SC',
    type: 'theory',
    batch: 'all',
    room: 'CR-204',
  },

  // TUESDAY
  {
    id: 'tue_lab_c',
    day: 'Tuesday',
    startTime: '09:00',
    endTime: '11:00',
    subjectCode: 'CECMP305',
    subjectName: 'AI Lab',
    type: 'lab',
    batch: 'C',
    room: 'Lab 2',
  },
  {
    id: 'tue_lab_d',
    day: 'Tuesday',
    startTime: '09:00',
    endTime: '11:00',
    subjectCode: 'CECMP303',
    subjectName: 'DCCN Lab',
    type: 'lab',
    batch: 'D',
    room: 'Lab 1',
  },
  {
    id: 'tue_daa',
    day: 'Tuesday',
    startTime: '11:15',
    endTime: '12:15',
    subjectCode: 'CECMP306',
    subjectName: 'DAA',
    type: 'theory',
    batch: 'all',
    room: 'CR-204',
  },
  {
    id: 'tue_ai',
    day: 'Tuesday',
    startTime: '12:15',
    endTime: '13:15',
    subjectCode: 'CECMP304',
    subjectName: 'AI',
    type: 'theory',
    batch: 'all',
    room: 'CR-204',
  },

  // WEDNESDAY
  {
    id: 'wed_lab_c_am',
    day: 'Wednesday',
    startTime: '09:00',
    endTime: '11:00',
    subjectCode: 'CECMP326',
    subjectName: 'SC Lab',
    type: 'lab',
    batch: 'C',
    room: 'Lab 4',
  },
  {
    id: 'wed_lab_d_am',
    day: 'Wednesday',
    startTime: '09:00',
    endTime: '11:00',
    subjectCode: 'CECMP307',
    subjectName: 'DAA Lab',
    type: 'lab',
    batch: 'D',
    room: 'Lab 3',
  },
  {
    id: 'wed_dccn',
    day: 'Wednesday',
    startTime: '11:15',
    endTime: '12:15',
    subjectCode: 'CECMP302',
    subjectName: 'DCCN',
    type: 'theory',
    batch: 'all',
    room: 'CR-204',
  },
  {
    id: 'wed_sc',
    day: 'Wednesday',
    startTime: '12:15',
    endTime: '13:15',
    subjectCode: 'CECMP325',
    subjectName: 'SC',
    type: 'theory',
    batch: 'all',
    room: 'CR-204',
  },
  {
    id: 'wed_lab_c_pm',
    day: 'Wednesday',
    startTime: '14:00',
    endTime: '16:00',
    subjectCode: 'CECMP307',
    subjectName: 'DAA Lab',
    type: 'lab',
    batch: 'C',
    room: 'Lab 3',
  },
  {
    id: 'wed_lab_d_pm',
    day: 'Wednesday',
    startTime: '14:00',
    endTime: '16:00',
    subjectCode: 'CECMP301',
    subjectName: 'DBMS Lab',
    type: 'lab',
    batch: 'D',
    room: 'Lab 2',
  },

  // THURSDAY
  {
    id: 'thu_lab_c',
    day: 'Thursday',
    startTime: '09:00',
    endTime: '11:00',
    subjectCode: 'CECMP301',
    subjectName: 'DBMS Lab',
    type: 'lab',
    batch: 'C',
    room: 'Lab 2',
  },
  {
    id: 'thu_lab_d',
    day: 'Thursday',
    startTime: '09:00',
    endTime: '11:00',
    subjectCode: 'CECMP307',
    subjectName: 'DAA Lab',
    type: 'lab',
    batch: 'D',
    room: 'Lab 3',
  },
  {
    id: 'thu_sc',
    day: 'Thursday',
    startTime: '11:15',
    endTime: '12:15',
    subjectCode: 'CECMP325',
    subjectName: 'SC',
    type: 'theory',
    batch: 'all',
    room: 'CR-204',
  },
  {
    id: 'thu_dbms',
    day: 'Thursday',
    startTime: '12:15',
    endTime: '13:15',
    subjectCode: 'CECMP300',
    subjectName: 'DBMS',
    type: 'theory',
    batch: 'all',
    room: 'CR-204',
  },
  {
    id: 'thu_daa',
    day: 'Thursday',
    startTime: '14:00',
    endTime: '15:00',
    subjectCode: 'CECMP306',
    subjectName: 'DAA',
    type: 'theory',
    batch: 'all',
    room: 'CR-204',
  },
  {
    id: 'thu_ai',
    day: 'Thursday',
    startTime: '15:00',
    endTime: '16:00',
    subjectCode: 'CECMP304',
    subjectName: 'AI',
    type: 'theory',
    batch: 'all',
    room: 'CR-204',
  },

  // FRIDAY
  {
    id: 'fri_lab_c',
    day: 'Friday',
    startTime: '09:00',
    endTime: '11:00',
    subjectCode: 'CECMP303',
    subjectName: 'DCCN Lab',
    type: 'lab',
    batch: 'C',
    room: 'Lab 1',
  },
  {
    id: 'fri_lab_d',
    day: 'Friday',
    startTime: '09:00',
    endTime: '11:00',
    subjectCode: 'CECMP305',
    subjectName: 'AI Lab',
    type: 'lab',
    batch: 'D',
    room: 'Lab 2',
  },
  {
    id: 'fri_dbms',
    day: 'Friday',
    startTime: '11:15',
    endTime: '12:15',
    subjectCode: 'CECMP300',
    subjectName: 'DBMS',
    type: 'theory',
    batch: 'all',
    room: 'CR-204',
  },
  {
    id: 'fri_dccn',
    day: 'Friday',
    startTime: '12:15',
    endTime: '13:15',
    subjectCode: 'CECMP302',
    subjectName: 'DCCN',
    type: 'theory',
    batch: 'all',
    room: 'CR-204',
  },
  {
    id: 'fri_mentoring',
    day: 'Friday',
    startTime: '16:00',
    endTime: '17:00',
    subjectCode: 'NCC301',
    subjectName: 'NCC / NSS / Mentoring',
    type: 'other',
    batch: 'all',
    room: 'Auditorium',
  },
];

const DAY_NAMES: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export function getDayOfWeekFromDate(date: Date): DayOfWeek | null {
  // Use IST day
  const istDateString = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istDate = new Date(istDateString);
  const dayIndex = istDate.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  if (dayIndex >= 1 && dayIndex <= 5) {
    return DAY_NAMES[dayIndex - 1];
  }
  return null;
}

export function formatISTDate(date: Date): string {
  const istDateString = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const d = new Date(istDateString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseMinutesFromTimeString(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function getCurrentISTTimeMinutes(): number {
  const now = new Date();
  const istDateString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istDate = new Date(istDateString);
  return istDate.getHours() * 60 + istDate.getMinutes();
}

export function getSlotsForDayAndBatch(day: DayOfWeek, batch: LabBatch): TimetableSlot[] {
  return TIMETABLE_SLOTS.filter((slot) => {
    if (slot.day !== day) return false;
    if (slot.batch === 'all') return true;
    return slot.batch === batch;
  });
}

export function generateSessionsForDate(date: Date, batch: LabBatch): LectureSession[] {
  const day = getDayOfWeekFromDate(date);
  if (!day) return [];

  const dateString = formatISTDate(date);
  const slots = getSlotsForDayAndBatch(day, batch);
  const currentMinutes = getCurrentISTTimeMinutes();
  const isToday = dateString === formatISTDate(new Date());

  return slots.map((slot) => {
    const startMinutes = parseMinutesFromTimeString(slot.startTime);
    const endMinutes = parseMinutesFromTimeString(slot.endTime);

    let status: LectureSession['status'] = 'upcoming';

    if (isToday) {
      if (currentMinutes < startMinutes) {
        status = 'upcoming';
      } else if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
        status = 'started';
      } else {
        status = 'unmarked';
      }
    } else if (date < new Date()) {
      status = 'unmarked';
    }

    return {
      id: `${dateString}_${slot.id}`,
      date: dateString,
      day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subjectCode: slot.subjectCode,
      subjectName: slot.subjectName,
      type: slot.type,
      batch: slot.batch,
      room: slot.room,
      status,
    };
  });
}
