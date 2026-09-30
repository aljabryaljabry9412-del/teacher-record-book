import { db, type GradeRecord, type GradeValue, clampGrade, roundToTenth, now, createId } from './database';

export interface GradeCalculations {
  firstTermAverage: GradeValue;
  secondTermAverage: GradeValue;
  annualAverage: GradeValue;
  passStatus: 'pass' | 'fail' | 'pending';
}

/**
 * حساب معدل الفصل الأول
 * = (الشفهي 1 + درجة الشهر 1 + الشفهي 2 + درجة الشهر 2) / 4
 * تقريب إلى أقرب عشر
 */
export function calculateFirstTermAverage(
  oral1: GradeValue,
  month1: GradeValue,
  oral2: GradeValue,
  month2: GradeValue
): GradeValue {
  if (
    oral1 === null || month1 === null ||
    oral2 === null || month2 === null
  ) return null;
  const sum = oral1 + month1 + oral2 + month2;
  return roundToTenth(sum / 4);
}

/**
 * حساب معدل الفصل الثاني
 * = (الشفهي 1 + درجة الشهر 1 + الشفهي 2 + درجة الشهر 2) / 4
 * تقريب إلى أقرب عشر
 */
export function calculateSecondTermAverage(
  oral1: GradeValue,
  month1: GradeValue,
  oral2: GradeValue,
  month2: GradeValue
): GradeValue {
  if (
    oral1 === null || month1 === null ||
    oral2 === null || month2 === null
  ) return null;
  const sum = oral1 + month1 + oral2 + month2;
  return roundToTenth(sum / 4);
}

/**
 * حساب المعدل السنوي
 * = (معدل الفصل الأول + درجة نصف السنة + معدل الفصل الثاني) / 3
 * تقريب إلى أقرب عشر
 */
export function calculateAnnualAverage(
  firstTermAverage: GradeValue,
  midYear: GradeValue,
  secondTermAverage: GradeValue
): GradeValue {
  if (
    firstTermAverage === null ||
    midYear === null ||
    secondTermAverage === null
  ) return null;
  const sum = firstTermAverage + midYear + secondTermAverage;
  return roundToTenth(sum / 3);
}

/**
 * التحقق من حالة النجاح
 * النجاح: >= 50
 * الرسوب: < 50
 * معلق: بدون معدل سنوي
 */
export function getPassStatus(annualAverage: GradeValue): 'pass' | 'fail' | 'pending' {
  if (annualAverage === null) return 'pending';
  return annualAverage >= 50 ? 'pass' : 'fail';
}

/**
 * حساب إحصائيات الفصل
 */
export interface ClassroomStats {
  totalStudents: number;
  passed: number;
  failed: number;
  passPercentage: GradeValue;
}

export async function getClassroomStats(
  classroomId: string,
  fieldName: 'firstTermAverage' | 'midYear' | 'secondTermAverage' | 'annualAverage',
  academicYear: string
): Promise<ClassroomStats> {
  const grades = await db.grades
    .where({ academicYear })
    .toArray();
  
  const students = await db.students
    .where({ classroomId })
    .toArray();
  
  const totalStudents = students.length;
  let passed = 0;
  let failed = 0;
  
  for (const student of students) {
    const grade = grades.find(g => g.studentId === student.id);
    if (!grade) continue;
    
    const value = grade[fieldName as keyof GradeRecord] as GradeValue;
    if (value === null) continue;
    
    if (value >= 50) passed++;
    else failed++;
  }
  
  const passPercentage = totalStudents > 0
    ? roundToTenth((passed / totalStudents) * 100)
    : null;
  
  return { totalStudents, passed, failed, passPercentage };
}

/**
 * حفظ درجة واحدة مع التحديث التلقائي للمعدلات
 */
export async function updateGradeField(
  studentId: string,
  academicYear: string,
  field: keyof Omit<GradeRecord, 'id' | 'studentId' | 'academicYear' | 'updatedAt'>,
  value: number | null
): Promise<GradeRecord> {
  const clamped = value === null ? null : clampGrade(value);
  const timestamp = now();
  
  let grade = await db.grades.get(`${studentId}-${academicYear}`);
  
  if (!grade) {
    grade = {
      id: createId(),
      studentId,
      academicYear,
      firstOral1: null,
      firstMonth1: null,
      firstOral2: null,
      firstMonth2: null,
      firstTermAverage: null,
      midYear: null,
      secondOral1: null,
      secondMonth1: null,
      secondOral2: null,
      secondMonth2: null,
      secondTermAverage: null,
      annualAverage: null,
      updatedAt: timestamp,
    };
  }
  
  // تحديث الحقل المطلوب
  (grade as any)[field] = clamped;
  
  // إعادة حساب المعدلات
  if (['firstOral1', 'firstMonth1', 'firstOral2', 'firstMonth2'].includes(field)) {
    grade.firstTermAverage = calculateFirstTermAverage(
      grade.firstOral1,
      grade.firstMonth1,
      grade.firstOral2,
      grade.firstMonth2
    );
  }
  
  if (['secondOral1', 'secondMonth1', 'secondOral2', 'secondMonth2'].includes(field)) {
    grade.secondTermAverage = calculateSecondTermAverage(
      grade.secondOral1,
      grade.secondMonth1,
      grade.secondOral2,
      grade.secondMonth2
    );
  }
  
  if (['firstTermAverage', 'midYear', 'secondTermAverage'].includes(field) ||
      ['firstOral1', 'firstMonth1', 'firstOral2', 'firstMonth2', 
       'secondOral1', 'secondMonth1', 'secondOral2', 'secondMonth2'].includes(field)) {
    grade.annualAverage = calculateAnnualAverage(
      grade.firstTermAverage,
      grade.midYear,
      grade.secondTermAverage
    );
  }
  
  grade.updatedAt = timestamp;
  await db.grades.put(grade);
  
  return grade;
}

/**
 * الحصول على درجات طالب
 */
export async function getStudentGrades(
  studentId: string,
  academicYear: string
): Promise<GradeRecord | null> {
  return db.grades.get(`${studentId}-${academicYear}`);
}

/**
 * إعادة حساب جميع المعدلات للفصل (في حالة ضرورة إعادة معالجة)
 */
export async function recalculateAllGrades(
  classroomId: string,
  academicYear: string
): Promise<void> {
  const students = await db.students.where({ classroomId }).toArray();
  const grades = await db.grades.where({ academicYear }).toArray();
  
  await db.transaction('rw', db.grades, async () => {
    for (const student of students) {
      const grade = grades.find(g => g.studentId === student.id);
      if (!grade) continue;
      
      // إعادة حساب المعدلات
      grade.firstTermAverage = calculateFirstTermAverage(
        grade.firstOral1,
        grade.firstMonth1,
        grade.firstOral2,
        grade.firstMonth2
      );
      
      grade.secondTermAverage = calculateSecondTermAverage(
        grade.secondOral1,
        grade.secondMonth1,
        grade.secondOral2,
        grade.secondMonth2
      );
      
      grade.annualAverage = calculateAnnualAverage(
        grade.firstTermAverage,
        grade.midYear,
        grade.secondTermAverage
      );
      
      grade.updatedAt = now();
      await db.grades.put(grade);
    }
  });
}
