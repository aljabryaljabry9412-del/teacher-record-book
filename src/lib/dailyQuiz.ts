import { db, createId, now, type DailyQuizRecord, type GradeRecord } from './database';
import { updateGradeField } from './gradeCalculations';

export type QuizAttempt = 1 | 2 | 3 | 4;

export function getQuizField(attempt: QuizAttempt) {
  return (['firstOral1', 'firstOral2', 'secondOral1', 'secondOral2'] as const)[attempt - 1];
}

export async function getTodayQuizRecords(classroomId: string, date = new Date().toISOString().slice(0, 10)) {
  return db.dailyQuiz.where({ classroomId, date }).toArray();
}

export async function getEligibleStudents(classroomId: string, attempt: QuizAttempt, date = new Date().toISOString().slice(0, 10)) {
  const students = await db.students.where({ classroomId }).sortBy('normalizedName');
  const records = await getTodayQuizRecords(classroomId, date);
  const completed = new Set(records.filter((record) => record.attempt === attempt).map((record) => record.studentId));
  return students.filter((student) => !completed.has(student.id));
}

export async function saveDailyQuizResult(input: {
  classroomId: string;
  studentId: string;
  academicYear: string;
  attempt: QuizAttempt;
  score: number | null;
  skipped?: boolean;
  unprepared?: boolean;
  date?: string;
}) {
  const date = input.date ?? new Date().toISOString().slice(0, 10);
  const timestamp = now();
  const record: DailyQuizRecord = {
    id: createId(), classroomId: input.classroomId, studentId: input.studentId, date,
    attempt: input.attempt, score: input.score, skipped: Boolean(input.skipped),
    unprepared: Boolean(input.unprepared), createdAt: timestamp, updatedAt: timestamp,
  };
  await db.dailyQuiz.add(record);
  if (input.score !== null && !input.skipped) {
    await updateGradeField(input.studentId, input.academicYear, getQuizField(input.attempt), input.score);
  }
  if (input.unprepared) {
    await db.noteEvents.add({ id: createId(), studentId: input.studentId, type: 'unprepared', occurredAt: timestamp, source: 'daily-quiz' });
  }
  return record;
}

export async function getQuizProgress(classroomId: string, attempt: QuizAttempt, date = new Date().toISOString().slice(0, 10)) {
  const total = await db.students.where({ classroomId }).count();
  const completed = (await getTodayQuizRecords(classroomId, date)).filter((record) => record.attempt === attempt).length;
  return { total, completed, remaining: Math.max(0, total - completed), finished: total > 0 && completed >= total };
}
