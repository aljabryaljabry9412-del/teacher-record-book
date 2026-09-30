export { db, seedDatabase, addStudent, deleteStudent, renumberStudents, clampGrade, averageGrades, roundToTenth, normalizeArabic, createId, now } from './database';
export { getClassroomStats, calculateFirstTermAverage, calculateSecondTermAverage, calculateAnnualAverage, getPassStatus, getStudentGrades, updateGradeField, recalculateAllGrades } from './gradeCalculations';
export type { SchoolProfile, Classroom, Student, GradeRecord, AttendanceRecord, AttendanceAttachment, NoteEvent, DailyQuizRecord, BackupSnapshot, CloudSettings, GradeValue, AttendanceStatus, BackupSource } from './database';

const digits = (value: number | string) => String(value).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

export { digits };
