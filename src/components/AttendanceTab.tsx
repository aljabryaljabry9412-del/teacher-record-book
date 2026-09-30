import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, CircleX, RotateCcw } from 'lucide-react';
import { getAttendanceForDate, localDate, saveAttendance } from '../lib/attendance';
import { digits, type AttendanceStatus, type Student } from '../lib';

export function AttendanceTab({ classroomId, students }: { classroomId: string; students: Student[] }) {
  const [date, setDate] = useState(localDate());
  const [index, setIndex] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  const ordered = useMemo(() => [...students].sort((a, b) => a.serialNumber - b.serialNumber), [students]);
  const current = ordered[index] ?? null;

  const load = useCallback(async () => {
    setLoading(true); setFinished(false); setIndex(0);
    const records = await getAttendanceForDate(classroomId, date);
    setStatuses(Object.fromEntries(records.map((record) => [record.studentId, record.status])));
    setLoading(false);
  }, [classroomId, date]);
  useEffect(() => { void load(); }, [load]);

  const mark = async (status: AttendanceStatus) => {
    if (!current) return;
    await saveAttendance(classroomId, current.id, status, date);
    const next = { ...statuses, [current.id]: status };
    setStatuses(next);
    if (index + 1 >= ordered.length) setFinished(true); else setIndex(index + 1);
  };
  const back = () => { if (finished) setFinished(false); setIndex(Math.max(0, index - 1)); };

  const present = Object.values(statuses).filter((s) => s === 'present').length;
  const absent = Object.values(statuses).filter((s) => s === 'absent').length;

  if (loading) return <div className="empty-page"><p>جاري تحميل سجل الحضور...</p></div>;
  if (finished) return <div className="stack attendance-page"><div className="page-heading"><div><span className="eyebrow">تقرير اليوم</span><h1>اكتمل تسجيل الحضور</h1><p>{date}</p></div><button className="icon-button" onClick={() => void load()}><RotateCcw size={18} /></button></div><section className="card attendance-summary"><div className="summary-stat present"><strong>{digits(present)}</strong><span>حاضر</span></div><div className="summary-stat absent"><strong>{digits(absent)}</strong><span>غائب</span></div></section><section className="card attendance-report"><h2>قائمة الطلاب</h2>{ordered.map((student) => <div className="attendance-row" key={student.id}><span>{student.fullName}</span><b className={statuses[student.id]}>{statuses[student.id] === 'present' ? 'حاضر' : statuses[student.id] === 'absent' ? 'غائب' : 'لم يسجل'}</b></div>)}</section><button className="secondary-button" onClick={back}><ArrowRight size={17} /> العودة لتعديل آخر طالب</button></div>;

  if (!current) return <div className="empty-page"><div className="empty-icon"><Check /></div><h1>لا يوجد طلاب</h1><p>أضف أسماء الطلاب أولاً من تبويب الأسماء والدرجات.</p></div>;
  return <div className="stack attendance-page"><div className="page-heading"><div><span className="eyebrow">تسجيل يومي</span><h1>سجل الحضور</h1><p>التاريخ: {date} · الطالب {digits(index + 1)} من {digits(ordered.length)}</p></div><input className="date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div><section className="card attendance-card"><div className="attendance-avatar">{current.fullName.slice(0, 1)}</div><h2>{current.fullName}</h2><p>اختر حالة الطالب</p><div className="attendance-actions"><button className="present-button" onClick={() => void mark('present')}><Check size={22} /> حاضر</button><button className="absent-button" onClick={() => void mark('absent')}><CircleX size={22} /> غائب</button></div><button className="back-button" onClick={back} disabled={index === 0}><ChevronRight size={17} /> العودة للخلف</button></section><div className="attendance-mini"><span>حاضر: <b>{digits(present)}</b></span><span>غائب: <b>{digits(absent)}</b></span><span>متبقّي: <b>{digits(Math.max(0, ordered.length - Object.keys(statuses).length))}</b></span></div></div>;
}
