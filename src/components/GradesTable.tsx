import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, Save } from 'lucide-react';
import { getStudentGrades, updateGradeField, getClassroomStats, type GradeRecord } from '../lib/gradeCalculations';
import { digits, type Student } from '../lib';

interface GradesTableProps {
  students: Student[];
  classroomId: string;
  academicYear: string;
  onRefresh?: () => void;
}

const columns = [
  { key: 'firstOral1', label: 'شفهي 1', term: 'first', rowGroup: 1 },
  { key: 'firstMonth1', label: 'درجة الشهر 1', term: 'first', rowGroup: 1 },
  { key: 'firstOral2', label: 'شفهي 2', term: 'first', rowGroup: 1 },
  { key: 'firstMonth2', label: 'درجة الشهر 2', term: 'first', rowGroup: 1 },
  { key: 'firstTermAverage', label: 'معدل الفصل 1', term: 'first', rowGroup: 2, isCalculated: true },
  { key: 'midYear', label: 'نصف السنة', term: 'both', rowGroup: 3 },
  { key: 'secondOral1', label: 'شفهي 1', term: 'second', rowGroup: 4 },
  { key: 'secondMonth1', label: 'درجة الشهر 1', term: 'second', rowGroup: 4 },
  { key: 'secondOral2', label: 'شفهي 2', term: 'second', rowGroup: 4 },
  { key: 'secondMonth2', label: 'درجة الشهر 2', term: 'second', rowGroup: 4 },
  { key: 'secondTermAverage', label: 'معدل الفصل 2', term: 'second', rowGroup: 5, isCalculated: true },
  { key: 'annualAverage', label: 'المعدل السنوي', term: 'both', rowGroup: 6, isCalculated: true },
] as const;

export function GradesTable({
  students,
  classroomId,
  academicYear,
  onRefresh,
}: GradesTableProps) {
  const [grades, setGrades] = useState<Map<string, GradeRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Map<string, any>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // تحميل الدرجات
  useEffect(() => {
    const loadGrades = async () => {
      setLoading(true);
      const gradeMap = new Map<string, GradeRecord>();
      const statsMap = new Map<string, any>();

      for (const student of students) {
        const grade = await getStudentGrades(student.id, academicYear);
        if (grade) gradeMap.set(student.id, grade);
      }

      // تحميل الإحصائيات لكل عمود
      for (const col of columns) {
        if (col.isCalculated) {
          const stat = await getClassroomStats(classroomId, col.key, academicYear);
          statsMap.set(col.key, stat);
        }
      }

      setGrades(gradeMap);
      setStats(statsMap);
      setLoading(false);
    };

    loadGrades();
  }, [students, classroomId, academicYear]);

  const handleGradeChange = async (studentId: string, fieldKey: string, value: string) => {
    setSaving(true);
    try {
      const numValue = value === '' ? null : parseFloat(value);
      const updated = await updateGradeField(
        studentId,
        academicYear,
        fieldKey as any,
        numValue
      );

      setGrades(prev => new Map(prev).set(studentId, updated));
      setEditingCell(null);

      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('خطأ في حفظ الدرجة:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grades-table-container loading">
        <div className="loading-spinner">جاري التحميل...</div>
      </div>
    );
  }

  const getGradeValue = (studentId: string, fieldKey: string) => {
    const grade = grades.get(studentId);
    if (!grade) return null;
    return (grade as any)[fieldKey];
  };

  const getGradeStatus = (value: any) => {
    if (value === null) return '';
    if (value < 50) return 'fail';
    return '';
  };

  return (
    <div className="grades-table-container">
      <div className="grades-header">
        <div className="header-stats">
          <span className="stat-item passed">✓ ناجحون</span>
          <span className="stat-item failed">✗ راسبون</span>
          <span className="stat-item percentage">النسبة المئوية</span>
        </div>
      </div>

      <div className="table-wrapper">
        <div className="table-scroll" ref={scrollContainerRef}>
          <table className="grades-table">
            <thead>
              <tr className="column-headers">
                <th className="col-number">#</th>
                <th className="col-name">الاسم</th>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={`col-grade col-${col.key} col-term-${col.term}`}
                    data-term={col.term}
                  >
                    <div className="th-content">
                      <span>{col.label}</span>
                      {col.term === 'first' && <span className="term-badge">الفصل 1</span>}
                      {col.term === 'second' && <span className="term-badge">الفصل 2</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => {
                const gradeRecord = grades.get(student.id);
                return (
                  <tr key={student.id} className="student-row">
                    <td className="col-number">{digits(student.serialNumber)}</td>
                    <td className="col-name">{student.fullName}</td>
                    {columns.map(col => {
                      const value = getGradeValue(student.id, col.key);
                      const status = getGradeStatus(value);
                      const cellId = `${student.id}-${col.key}`;
                      const isEditing = editingCell === cellId;

                      return (
                        <td
                          key={col.key}
                          className={`col-grade col-${col.key} ${status} ${col.isCalculated ? 'calculated' : ''}`}
                          onClick={() => !col.isCalculated && setEditingCell(cellId)}
                        >
                          {isEditing && !col.isCalculated ? (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={value ?? ''}
                              autoFocus
                              onBlur={(e) => handleGradeChange(student.id, col.key, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleGradeChange(student.id, col.key, e.currentTarget.value);
                                } else if (e.key === 'Escape') {
                                  setEditingCell(null);
                                }
                              }}
                            />
                          ) : (
                            <span className="grade-value">{value !== null ? digits(value) : '-'}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {/* صف الإحصائيات */}
              <tr className="stats-row">
                <td colSpan={2} className="stats-label">الإحصائيات</td>
                {columns.map(col => {
                  if (!col.isCalculated) return <td key={col.key} />;
                  const stat = stats.get(col.key);
                  return (
                    <td key={col.key} className="stats-cell">
                      <div className="stat-group">
                        <div className="stat-item">ناجحون: {digits(stat?.passed || 0)}</div>
                        <div className="stat-item">راسبون: {digits(stat?.failed || 0)}</div>
                        <div className="stat-item percentage">
                          {stat?.passPercentage !== null ? digits(stat?.passPercentage) : '-'}%
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {saving && (
        <div className="saving-indicator">
          <Save size={16} /> جاري الحفظ...
        </div>
      )}
    </div>
  );
}
