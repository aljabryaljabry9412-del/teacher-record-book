import { useCallback, useEffect, useState } from 'react';
import { Check, CircleAlert, FastForward, RotateCcw, SkipForward } from 'lucide-react';
import { getEligibleStudents, getQuizProgress, quizDate, saveDailyQuizResult, type QuizAttempt } from '../lib/dailyQuiz';
import { digits, type Student } from '../lib';

type Props = { classroomId: string; academicYear: string; students: Student[] };
const roundLabels: Record<QuizAttempt, string> = { 1: 'شفهي ١ — الفصل الأول', 2: 'شفهي ٢ — الفصل الأول', 3: 'شفهي ١ — الفصل الثاني', 4: 'شفهي ٢ — الفصل الثاني' };

export function DailyQuizTab({ classroomId, academicYear, students }: Props) {
  const [attempt, setAttempt] = useState<QuizAttempt>(1);
  const [date, setDate] = useState(quizDate());
  const [queue, setQueue] = useState<Student[]>([]);
  const [current, setCurrent] = useState<Student | null>(null);
  const [score, setScore] = useState('');
  const [unprepared, setUnprepared] = useState(false);
  const [progress, setProgress] = useState({ total: students.length, completed: 0, remaining: students.length, unpreparedCount: 0, finished: false });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (nextAttempt = attempt, selectedDate = date) => {
    const [eligible, status] = await Promise.all([
      getEligibleStudents(classroomId, nextAttempt, selectedDate),
      getQuizProgress(classroomId, nextAttempt, selectedDate),
    ]);
    setQueue(eligible);
    setProgress(status);
    setCurrent((old) => old && eligible.some((student) => student.id === old.id) ? old : null);
  }, [attempt, classroomId, date]);

  useEffect(() => { void refresh(); }, [refresh, students.length]);

  const chooseNext = () => {
    if (!queue.length) { setMessage('اكتملت درجات جميع الطلاب في هذه الجولة.'); return; }
    const random = queue[Math.floor(Math.random() * queue.length)];
    setCurrent(random); setScore(''); setUnprepared(false); setMessage('');
  };

  const save = async (skipped = false) => {
    if (!current || busy) return;
    const value = score === '' ? null : Number(score);
    if (!skipped && (value === null || !Number.isInteger(value) || value < 0 || value > 100)) {
      setMessage('أدخل درجة صحيحة من ٠ إلى ١٠٠.'); return;
    }
    setBusy(true);
    try {
      await saveDailyQuizResult({ classroomId, academicYear, studentId: current.id, attempt, score: skipped ? null : value, skipped, unprepared, date });
      const warning = unprepared && progress.unpreparedCount + 1 >= 2 ? ' تنبيه: تم تسجيل عدم تحضير هذا الطالب مرتين أو أكثر.' : '';
      setMessage((skipped ? 'تم تخطي الطالب.' : 'تم حفظ الدرجة وإضافتها إلى سجل الدرجات.') + warning);
      await refresh();
      setCurrent(null); setScore(''); setUnprepared(false);
    } finally { setBusy(false); }
  };

  const changeAttempt = async (value: QuizAttempt) => { setAttempt(value); setCurrent(null); setMessage(''); await refresh(value); };
  const changeDate = async (value: string) => { if (!value) return; setDate(value); setCurrent(null); setMessage(''); await refresh(attempt, value); };

  return <div className="stack daily-quiz">
    <div className="page-heading"><div><span className="eyebrow">تقييم سريع</span><h1>الاختبار اليومي</h1><p>اختر طالباً عشوائياً وسجل درجة الشفهي دون تكرار.</p></div><div className="quiz-toolbar"><label>تاريخ الاختبار<input type="date" value={date} onChange={(e) => void changeDate(e.target.value)} /></label><div className="quiz-progress">{digits(progress.completed)} / {digits(progress.total)}</div></div></div>
    <section className="card quiz-rounds"><strong>{roundLabels[attempt]}</strong><div className="round-buttons">{([1, 2, 3, 4] as QuizAttempt[]).map((item) => <button key={item} className={attempt === item ? 'selected' : ''} onClick={() => void changeAttempt(item)}>{roundLabels[item]}</button>)}</div><div className="progress-line"><span style={{ width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%` }} /></div><small>متبقّي {digits(progress.remaining)} طالب · غير محضر: {digits(progress.unpreparedCount)}</small></section>
    <section className="card quiz-card">{current ? <><div className="quiz-student-avatar">{current.fullName.slice(0, 1)}</div><h2>{current.fullName}</h2><p className="quiz-hint">اكتب درجة الشفهي للطالب</p><input className="quiz-score" type="number" min="0" max="100" step="1" inputMode="numeric" value={score} onChange={(e) => setScore(e.target.value)} autoFocus placeholder="٠٠" /><label className="unprepared-check"><input type="checkbox" checked={unprepared} onChange={(e) => setUnprepared(e.target.checked)} /> الطالب غير محضر ❎</label><div className="quiz-actions"><button className="skip-button" onClick={() => void save(true)} disabled={busy}><SkipForward size={17} /> تخطي</button><button className="primary-button" onClick={() => void save()} disabled={busy}><Check size={17} /> حفظ والانتقال</button></div></> : <><div className="empty-icon"><RotateCcw /></div><h2>{progress.finished ? 'اكتملت الجولة' : 'جاهز للاختبار؟'}</h2><p>{message || 'سيظهر اسم طالب عشوائي عند الضغط على الزر.'}</p><button className="primary-button" onClick={chooseNext} disabled={progress.finished}><FastForward size={17} /> الاسم التالي</button></>}</section>
    {message && !current && <div className="quiz-message"><CircleAlert size={16} /> {message}</div>}
  </div>;
}
