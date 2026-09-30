import Dexie, { type Table } from 'dexie';

export type Term = 'first' | 'second';
export type AttendanceStatus = 'present' | 'absent';
export type BackupSource = 'manual' | 'automatic' | 'cloud';
export type GradeValue = number | null;

export interface SchoolProfile {
  id: string;
  schoolName: string;
  teacherName: string;
  subjectName: string;
  logoDataUrl?: string;
  activeClassroomId: string;
  cloudEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Classroom {
  id: string;
  profileId: string;
  stage: string;
  division: string;
  academicYear: string;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  classroomId: string;
  fullName: string;
  normalizedName: string;
  serialNumber: number;
  photoDataUrl?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface GradeRecord {
  id: string;
  studentId: string;
  academicYear: string;
  firstOral1: GradeValue;
  firstMonth1: GradeValue;
  firstOral2: GradeValue;
  firstMonth2: GradeValue;
  firstTermAverage: GradeValue;
  midYear: GradeValue;
  secondOral1: GradeValue;
  secondMonth1: GradeValue;
  secondOral2: GradeValue;
  secondMonth2: GradeValue;
  secondTermAverage: GradeValue;
  annualAverage: GradeValue;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  classroomId: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceAttachment {
  id: string;
  classroomId: string;
  date: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  createdAt: string;
}

export interface NoteEvent {
  id: string;
  studentId: string;
  type: 'absence' | 'misbehavior' | 'unprepared';
  occurredAt: string;
  source: 'attendance' | 'daily-quiz' | 'manual';
}

export interface DailyQuizRecord {
  id: string;
  classroomId: string;
  studentId: string;
  date: string;
  attempt: 1 | 2 | 3 | 4;
  score: number | null;
  skipped: boolean;
  unprepared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BackupSnapshot {
  id: string;
  source: BackupSource;
  fileName: string;
  payload: string;
  createdAt: string;
}

export interface CloudSettings {
  id: 'default';
  enabled: boolean;
  username?: string;
  encryptedSecret?: string;
  lastSyncedAt?: string;
  pendingChanges: number;
  updatedAt: string;
}

export const now = () => new Date().toISOString();
export const createId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const normalizeArabic = (value: string) => value.trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[ًٌٍَُِّْـ]/g, '').toLocaleLowerCase('ar');
export const clampGrade = (value: number | string | null): number | null => {
  if (value === null || value === '') return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : null;
};
export const roundToTenth = (value: number) => Math.round(value * 10) / 10;
export const averageGrades = (values: GradeValue[]) => {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return valid.length === values.length ? roundToTenth(valid.reduce((sum, value) => sum + value, 0) / valid.length) : null;
};

export class TeacherRecordDatabase extends Dexie {
  profiles!: Table<SchoolProfile, string>;
  classrooms!: Table<Classroom, string>;
  students!: Table<Student, string>;
  grades!: Table<GradeRecord, string>;
  attendance!: Table<AttendanceRecord, string>;
  attendanceAttachments!: Table<AttendanceAttachment, string>;
  noteEvents!: Table<NoteEvent, string>;
  dailyQuiz!: Table<DailyQuizRecord, string>;
  backups!: Table<BackupSnapshot, string>;
  cloudSettings!: Table<CloudSettings, 'default'>;

  constructor() {
    super('TeacherRecordBook');
    this.version(1).stores({
      profiles: 'id, updatedAt',
      classrooms: 'id, profileId, [profileId+stage], updatedAt',
      students: 'id, classroomId, [classroomId+normalizedName], serialNumber, updatedAt',
      grades: 'id, studentId, academicYear, updatedAt',
      attendance: 'id, classroomId, studentId, [classroomId+date], [studentId+date], status',
      attendanceAttachments: 'id, classroomId, date, [classroomId+date]',
      noteEvents: 'id, studentId, type, occurredAt',
      dailyQuiz: 'id, classroomId, studentId, [classroomId+date], date, attempt',
      backups: 'id, createdAt, source',
      cloudSettings: 'id, enabled, updatedAt',
    });
  }
}

export const db = new TeacherRecordDatabase();

export async function seedDatabase() {
  if (await db.profiles.count()) return;
  const profileId = createId();
  const classroomId = createId();
  const timestamp = now();
  await db.transaction('rw', [db.profiles, db.classrooms, db.cloudSettings], async () => {
    await db.profiles.add({ id: profileId, schoolName: 'مدرسة النور النموذجية', teacherName: 'الأستاذ محمد أحمد', subjectName: 'اللغة العربية', activeClassroomId: classroomId, cloudEnabled: false, createdAt: timestamp, updatedAt: timestamp });
    await db.classrooms.add({ id: classroomId, profileId, stage: 'الأول المتوسط', division: 'أ', academicYear: String(new Date().getFullYear()), createdAt: timestamp, updatedAt: timestamp });
    await db.cloudSettings.add({ id: 'default', enabled: false, pendingChanges: 0, updatedAt: timestamp });
  });
}

export async function renumberStudents(classroomId: string) {
  const students = await db.students.where('classroomId').equals(classroomId).sortBy('normalizedName');
  await db.transaction('rw', db.students, async () => {
    await Promise.all(students.map((student, index) => db.students.update(student.id, { serialNumber: index + 1, updatedAt: now() })));
  });
}

export async function addStudent(classroomId: string, fullName: string) {
  const timestamp = now();
  const student: Student = { id: createId(), classroomId, fullName: fullName.trim(), normalizedName: normalizeArabic(fullName), serialNumber: 0, notes: '', createdAt: timestamp, updatedAt: timestamp };
  await db.students.add(student);
  await renumberStudents(classroomId);
  return student;
}

export async function deleteStudent(studentId: string, classroomId: string) {
  await db.transaction('rw', [db.students, db.grades, db.attendance, db.noteEvents, db.dailyQuiz], async () => {
    await Promise.all([
      db.students.delete(studentId),
      db.grades.where('studentId').equals(studentId).delete(),
      db.attendance.where('studentId').equals(studentId).delete(),
      db.noteEvents.where('studentId').equals(studentId).delete(),
      db.dailyQuiz.where('studentId').equals(studentId).delete(),
    ]);
  });
  await renumberStudents(classroomId);
}
