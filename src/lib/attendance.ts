import { db, createId, now, type AttendanceRecord, type AttendanceStatus } from './database';

export const localDate = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

export async function getAttendanceForDate(classroomId: string, date = localDate()) {
  return db.attendance.where({ classroomId, date }).toArray();
}

export async function saveAttendance(classroomId: string, studentId: string, status: AttendanceStatus, date = localDate()) {
  const existing = await db.attendance.where({ classroomId, studentId, date }).first();
  const timestamp = now();
  const record: AttendanceRecord = {
    id: existing?.id ?? createId(), classroomId, studentId, date, status,
    createdAt: existing?.createdAt ?? timestamp, updatedAt: timestamp,
  };
  await db.attendance.put(record);
  if (status === 'absent') {
    const alreadyNoted = await db.noteEvents.where({ studentId, type: 'absence' }).filter((event) => event.occurredAt.slice(0, 10) === date).first();
    if (!alreadyNoted) await db.noteEvents.add({ id: createId(), studentId, type: 'absence', occurredAt: timestamp, source: 'attendance' });
  }
  return record;
}
