export { db, seedDatabase, addStudent, deleteStudent, renumberStudents, clampGrade, averageGrades, roundToTenth, normalizeArabic, createId, now } from './database';
export type { SchoolProfile, Classroom, Student, GradeRecord, AttendanceRecord, AttendanceAttachment, NoteEvent, DailyQuizRecord, BackupSnapshot, CloudSettings, GradeValue, AttendanceStatus, BackupSource } from './database';
