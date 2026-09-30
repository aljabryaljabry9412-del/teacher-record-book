import { db, type Student, type SchoolProfile, type Classroom, normalizeArabic } from './database';

export interface LocalAppState {
  profile: SchoolProfile;
  classroom: Classroom;
  students: Student[];
}

export async function loadActiveState(): Promise<LocalAppState | null> {
  const profile = await db.profiles.toCollection().first();
  if (!profile) return null;
  const classroom = await db.classrooms.get(profile.activeClassroomId);
  if (!classroom) return null;
  const students = await db.students.where('classroomId').equals(classroom.id).sortBy('normalizedName');
  return { profile, classroom, students };
}

export async function saveProfileAndClassroom(profile: SchoolProfile, classroom: Classroom) {
  const timestamp = new Date().toISOString();
  await db.transaction('rw', [db.profiles, db.classrooms], async () => {
    await db.profiles.put({ ...profile, updatedAt: timestamp });
    await db.classrooms.put({ ...classroom, updatedAt: timestamp });
  });
}

export async function saveStudent(student: Student) {
  await db.students.put({ ...student, normalizedName: normalizeArabic(student.fullName), updatedAt: new Date().toISOString() });
}
